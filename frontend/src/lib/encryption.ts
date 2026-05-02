/**
 * Encrypted Note Storage
 *
 * Users can optionally encrypt their deposit notes with a password and store
 * them in localStorage. This way they don't have to manually save a text string.
 *
 * Uses Web Crypto API (AES-GCM 256-bit) — runs entirely in the browser.
 * No keys or plaintext ever leave the client.
 */

const STORAGE_KEY = "cashinviz-notes";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 600_000; // PBKDF2 iterations (OWASP recommended)

// ── Key derivation ───────────────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── Encrypt / Decrypt ────────────────────────────────────────

export async function encryptNote(
  noteString: string,
  password: string
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(noteString)
  );

  // Pack: salt + iv + ciphertext → base64
  const packed = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  packed.set(salt, 0);
  packed.set(iv, salt.length);
  packed.set(new Uint8Array(encrypted), salt.length + iv.length);

  return bytesToBase64(packed);
}

export async function decryptNote(
  encryptedBase64: string,
  password: string
): Promise<string> {
  const packed = base64ToBytes(encryptedBase64);

  const salt = packed.slice(0, SALT_LENGTH);
  const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// ── base64 helpers ───────────────────────────────────────────
// `btoa(String.fromCharCode(...spread))` works for tiny inputs but
// blows the call stack at ~64-128KB on most engines because the spread
// pushes every byte as a separate argument. Notes are short today, but
// a future encrypted blob (multiple notes, attachments) would silently
// crash. Chunked encode + a streaming decode keeps us safe at any size.

const CHUNK = 0x8000; // 32KB — well under every engine's argument limit

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const end = Math.min(i + CHUNK, bytes.length);
    // Slice gives us a typed-array view; fromCharCode handles up to
    // CHUNK args safely on every modern engine.
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, end) as unknown as number[],
    );
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// ── LocalStorage management ──────────────────────────────────

export interface StoredNote {
  id: string;
  encryptedData: string;
  chainId: number;
  token: string;
  amount: string;
  timestamp: number;
  isSpent: boolean;
}

export function getSavedNotes(): StoredNote[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveNote(note: StoredNote): void {
  const notes = getSavedNotes();
  notes.push(note);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function markNoteSpent(noteId: string): void {
  const notes = getSavedNotes();
  const updated = notes.map((n) =>
    n.id === noteId ? { ...n, isSpent: true } : n
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteNote(noteId: string): void {
  const notes = getSavedNotes();
  const filtered = notes.filter((n) => n.id !== noteId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearAllNotes(): void {
  localStorage.removeItem(STORAGE_KEY);
}
