"use client";

import { useState, useEffect } from "react";
import {
  getSavedNotes,
  deleteNote,
  type StoredNote,
} from "@/lib/encryption";

/**
 * Note Manager — encrypted local storage for deposit notes.
 *
 * Users can:
 * - View all their saved notes (encrypted in localStorage)
 * - See which notes are spent vs unspent
 * - Delete notes they no longer need
 * - Copy note strings for withdrawal
 */
export function NoteManager() {
  const [notes, setNotes] = useState<StoredNote[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setNotes(getSavedNotes());
  }, []);

  function handleDelete(id: string) {
    deleteNote(id);
    setNotes(getSavedNotes());
  }

  function handleCopy(note: StoredNote) {
    navigator.clipboard.writeText(note.encryptedData);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">No saved notes</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Notes are saved locally when you deposit
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-[var(--text-secondary)]">Your Notes</h3>
        <span className="text-xs text-[var(--text-muted)]">
          {notes.filter((n) => !n.isSpent).length} active
        </span>
      </div>

      {notes.map((note) => (
        <div
          key={note.id}
          className={`bg-[var(--bg)] border rounded-lg p-3 ${
            note.isSpent
              ? "border-[var(--border)] opacity-50"
              : "border-[var(--border)]"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  note.isSpent ? "bg-[var(--text-muted)]" : "bg-emerald-400"
                }`}
              />
              <span className="text-sm font-medium text-white">
                {note.amount} {note.token}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {note.isSpent && (
                <span className="text-xs text-[var(--text-muted)] mr-2">Spent</span>
              )}
              <span className="text-xs text-[var(--text-muted)]">
                Chain {note.chainId}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {!note.isSpent && (
              <button
                onClick={() => handleCopy(note)}
                className="flex-1 py-1.5 rounded text-xs border border-[var(--border)] hover:border-[#6366f1]/50 transition-colors"
              >
                {copiedId === note.id ? "Copied!" : "Copy Note"}
              </button>
            )}
            <button
              onClick={() => handleDelete(note.id)}
              className="py-1.5 px-3 rounded text-xs border border-mixer-red/30 text-mixer-red hover:bg-mixer-red/10 transition-colors"
            >
              Delete
            </button>
          </div>

          <p className="text-xs text-[var(--text-faint)] mt-2">
            {new Date(note.timestamp).toLocaleDateString()} {new Date(note.timestamp).toLocaleTimeString()}
          </p>
        </div>
      ))}
    </div>
  );
}
