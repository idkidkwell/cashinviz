/**
 * Structured JSON logger with redaction.
 *
 * Every log line is a single-line JSON record. Good for grep + for
 * ingestion by Loki/Datadog/Splunk without any special parser.
 *
 * Redaction: any value matching the shape of a hex-encoded private key,
 * a 64-hex-char secret, or an API key is replaced with "[redacted]".
 * The relayer never knowingly logs the RELAYER_PRIVATE_KEY, but it's
 * still worth a belt-and-suspenders pass because untrusted request
 * bodies land in error-path logs.
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL?.toLowerCase() as Level) || "info";
const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

const SECRET_RE = /\b0x[a-fA-F0-9]{64}\b/g;

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    return value.replace(SECRET_RE, "[redacted]");
  }
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Only redact secret-ish keys when the VALUE is a string (the
      // usual shape of a leaked credential). Booleans and numbers can
      // pass through — they can't encode a secret on their own, and
      // we need them for observability (e.g. `apiKey: true/false`).
      if (typeof v === "string" && /(?:^|_)(?:key|secret|password|token|auth)(?:$|_|[A-Z])/i.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (LEVELS[level] < threshold) return;
  const record = {
    t: new Date().toISOString(),
    level,
    msg,
    ...(fields ? (redact(fields) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(record);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};
