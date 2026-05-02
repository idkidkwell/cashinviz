/**
 * Input validators for relay requests.
 *
 * Every handler pulls untyped JSON off the wire. We centralize the
 * assertions here so:
 *   - Error messages are consistent across endpoints.
 *   - A malformed field is rejected at the edge — never reaches viem,
 *     which would otherwise stringify something nonsensical into an
 *     RPC call.
 *   - We never pass a "bytes" field of unbounded length through to the
 *     chain (proofs have a known upper bound).
 */

export class ValidationError extends Error {
  constructor(public readonly field: string, msg: string) {
    super(`${field}: ${msg}`);
    this.name = "ValidationError";
  }
}

const HEX_RE = /^0x[0-9a-fA-F]*$/;

export function asHexString(
  value: unknown,
  field: string,
  opts: { bytes?: number; maxBytes?: number } = {},
): `0x${string}` {
  if (typeof value !== "string") throw new ValidationError(field, "must be a string");
  if (!HEX_RE.test(value)) throw new ValidationError(field, "must be 0x-prefixed hex");
  const hexLen = value.length - 2; // strip "0x"
  if (hexLen % 2 !== 0) throw new ValidationError(field, "odd number of hex chars");
  const bytes = hexLen / 2;
  if (opts.bytes !== undefined && bytes !== opts.bytes) {
    throw new ValidationError(field, `expected ${opts.bytes} bytes, got ${bytes}`);
  }
  if (opts.maxBytes !== undefined && bytes > opts.maxBytes) {
    throw new ValidationError(field, `exceeds max ${opts.maxBytes} bytes (got ${bytes})`);
  }
  return value as `0x${string}`;
}

export function asAddress(value: unknown, field: string): `0x${string}` {
  return asHexString(value, field, { bytes: 20 });
}

export function asBytes32(value: unknown, field: string): `0x${string}` {
  return asHexString(value, field, { bytes: 32 });
}

// Proofs are large but bounded. UltraHonk with 7 public inputs sits
// around 14KB. 64KB is a generous cap that still rejects DoS payloads.
export function asProof(value: unknown, field: string = "proof"): `0x${string}` {
  return asHexString(value, field, { maxBytes: 64 * 1024 });
}

export function asBigInt(value: unknown, field: string, opts: { min?: bigint; max?: bigint } = {}): bigint {
  let n: bigint;
  try {
    if (typeof value === "bigint") n = value;
    else if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new ValidationError(field, "number out of safe-integer range — send as string");
      }
      n = BigInt(value);
    } else if (typeof value === "string") {
      if (!/^\d+$/.test(value) && !HEX_RE.test(value)) {
        throw new ValidationError(field, "must be a decimal or 0x-hex string");
      }
      n = BigInt(value);
    } else {
      throw new ValidationError(field, "must be a number, bigint, or numeric string");
    }
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(field, "invalid numeric value");
  }
  if (n < 0n) throw new ValidationError(field, "must be non-negative");
  if (opts.min !== undefined && n < opts.min) throw new ValidationError(field, `below minimum ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new ValidationError(field, `above maximum ${opts.max}`);
  return n;
}

export function asChainId(value: unknown, field: string = "chainId"): number {
  if (typeof value === "string") value = Number(value);
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError(field, "must be a positive integer");
  }
  return value;
}
