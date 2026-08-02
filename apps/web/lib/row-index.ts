/**
 * Row-index helpers for exact range slicing.
 *
 * Shelby blobs are opaque byte objects; `range` in the SDK is a byte range.
 * To deliver "the first N records" without truncating a row, Meris builds a
 * line index at upload time: the byte offset just after every line terminator.
 * A request for N records then maps to `end = lineEnds[N - 1]`, which lands
 * exactly on a line boundary.
 */

export const MAX_INDEXABLE_BYTES = 100 * 1024 * 1024; // 100 MB — matches upload cap

/**
 * Byte offsets just after each line terminator (LF, or CRLF counted as one).
 * A final line without a trailing newline contributes its end-of-file offset.
 */
export function buildLineEnds(bytes: Uint8Array): number[] {
  const lineEnds: number[] = [];
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] === 0x0a) {
      // LF — include a preceding CR in the line terminator.
      lineEnds.push(i + 1);
      i += 1;
    } else {
      i += 1;
    }
  }
  // No trailing newline: the last line ends at EOF.
  if (bytes.length > 0 && (lineEnds.length === 0 || lineEnds[lineEnds.length - 1] < bytes.length)) {
    lineEnds.push(bytes.length);
  }
  return lineEnds;
}

/**
 * Byte offset that delivers exactly `wanted` lines (records) — the end of the
 * Nth line, as Shelby's inclusive HTTP Range end, capped at the last line.
 * Returns 0 when nothing is requested or
 * the index is empty.
 */
export function recordsToEndOffset(lineEnds: number[], wanted: number): number {
  if (wanted <= 0 || lineEnds.length === 0) return 0;
  const idx = Math.min(wanted, lineEnds.length) - 1;
  // `lineEnds` stores exclusive offsets; Shelby's HTTP Range end is inclusive.
  return Math.max(0, lineEnds[idx] - 1);
}

export type ResolvedRange = { end?: number; exact: boolean };

/**
 * Choose the stream end offset for a range request.
 * - `records` + a line index  -> exact row-boundary slice.
 * - otherwise                 -> the client-provided byte range (approximate).
 */
export function resolveEndOffset(params: {
  lineEnds?: number[];
  records?: number;
  end?: number;
}): ResolvedRange {
  if (params.records !== undefined && params.lineEnds && params.lineEnds.length > 0) {
    const end = recordsToEndOffset(params.lineEnds, params.records);
    return { end, exact: true };
  }
  return { end: params.end, exact: false };
}

/**
 * Cheap guard: only build an index for line-based text. Binary content
 * (NUL bytes in the first 64 KB) or files with no newline get no index and
 * keep byte-proportional fallback.
 */
export function looksLineIndexable(bytes: Uint8Array): boolean {
  const probe = Math.min(bytes.length, 64 * 1024);
  let hasNewline = false;
  for (let i = 0; i < probe; i += 1) {
    if (bytes[i] === 0x00) return false;
    if (bytes[i] === 0x0a) hasNewline = true;
  }
  return hasNewline;
}

const SIZE_UNITS: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

/** Parse a human file size ("86 MB", "500 B") to bytes. 0 when unparsable. */
export function parseByteSize(size: string): number {
  const match = size.trim().match(/([\d.]+)\s*(B|KB|MB|GB|TB)/i);
  if (!match) return 0;
  const n = Number(match[1]);
  const mult = SIZE_UNITS[match[2].toUpperCase()] ?? 1;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * mult);
}

/**
 * Inclusive HTTP Range end for `wantedRecords` of `totalRecords`, based on the
 * publisher-declared blob size. Used to cap unindexed listings so a buyer can
 * never request more bytes than the slice they paid for.
 */
export function declaredSliceEndBytes(
  declaredSizeBytes: number,
  wantedRecords: number,
  totalRecords: number,
): number {
  if (declaredSizeBytes <= 0 || wantedRecords <= 0 || totalRecords <= 0) return 0;
  const wanted = Math.min(wantedRecords, totalRecords);
  const end = Math.round((declaredSizeBytes * wanted) / totalRecords) - 1;
  return Math.max(0, Math.min(declaredSizeBytes - 1, end));
}
