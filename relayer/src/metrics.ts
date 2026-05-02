/**
 * Lightweight in-process metrics — request duration histogram +
 * simple counters — rendered in Prometheus exposition format.
 *
 * We roll our own instead of pulling in `prom-client` because:
 *   - Zero extra deps.
 *   - Exposition format is a few lines of string concatenation.
 *   - The relayer's hot path is I/O bound on the RPC, not on
 *     metric collection overhead.
 *
 * Buckets are in milliseconds, chosen around real relayer latency:
 * simulation (~200ms) < estimate (~200ms) < broadcast (~500ms) <
 * one-block confirmation (~2s mainnet, 200ms L2) < timeout (120s).
 */

const DURATION_BUCKETS_MS = [50, 100, 250, 500, 1_000, 2_500, 5_000, 10_000, 30_000, 60_000, 120_000];

interface Histogram {
  counts: number[]; // same length as buckets + 1 (for +Inf)
  sum: number;
  count: number;
}

function emptyHist(): Histogram {
  return { counts: new Array(DURATION_BUCKETS_MS.length + 1).fill(0), sum: 0, count: 0 };
}

const durationByEndpoint = new Map<string, Histogram>();

/** Record a completed request's duration in milliseconds. */
export function observeDuration(endpoint: string, durationMs: number): void {
  let h = durationByEndpoint.get(endpoint);
  if (!h) {
    h = emptyHist();
    durationByEndpoint.set(endpoint, h);
  }
  h.sum += durationMs;
  h.count += 1;
  // Cumulative: increment every bucket >= this observation.
  let placed = false;
  for (let i = 0; i < DURATION_BUCKETS_MS.length; i++) {
    if (durationMs <= DURATION_BUCKETS_MS[i]) {
      for (let j = i; j < h.counts.length; j++) h.counts[j]++;
      placed = true;
      break;
    }
  }
  if (!placed) {
    // Slower than every bucket — still goes into +Inf.
    h.counts[h.counts.length - 1]++;
  }
}

/** Render histogram lines in Prometheus text exposition format. */
export function renderDurationMetrics(): string[] {
  const lines: string[] = [
    "# HELP relayer_request_duration_ms Request duration by endpoint",
    "# TYPE relayer_request_duration_ms histogram",
  ];
  for (const [endpoint, h] of durationByEndpoint) {
    for (let i = 0; i < DURATION_BUCKETS_MS.length; i++) {
      lines.push(
        `relayer_request_duration_ms_bucket{endpoint="${endpoint}",le="${DURATION_BUCKETS_MS[i]}"} ${h.counts[i]}`,
      );
    }
    lines.push(`relayer_request_duration_ms_bucket{endpoint="${endpoint}",le="+Inf"} ${h.count}`);
    lines.push(`relayer_request_duration_ms_sum{endpoint="${endpoint}"} ${h.sum}`);
    lines.push(`relayer_request_duration_ms_count{endpoint="${endpoint}"} ${h.count}`);
  }
  return lines;
}
