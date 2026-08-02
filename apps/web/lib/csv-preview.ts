/**
 * Lightweight CSV head parser for dataset previews. Reads the first bytes of a
 * blob and renders a few rows — enough to answer "what does this data look
 * like" without loading the whole file.
 */

export type CsvHead = {
  columns: string[];
  rows: string[][];
  truncated: boolean;
};

/** Pick the most likely delimiter from the first line. */
export function detectDelimiter(line: string): string {
  const counts = [',', ';', '\t'].map((d) => ({
    d,
    n: line.split(d).length - 1,
  }));
  const best = counts.sort((a, b) => b.n - a.n)[0];
  return best && best.n > 0 ? best.d : ',';
}

function parseLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function parseCsvHead(
  text: string,
  opts?: { maxRows?: number; maxCellLength?: number },
): CsvHead {
  const maxRows = opts?.maxRows ?? 10;
  const maxCellLength = opts?.maxCellLength ?? 256;
  const trimmed = text.replace(/^\uFEFF/, ''); // BOM
  if (trimmed.trim() === '') return { columns: [], rows: [], truncated: false };
  const lines = trimmed.split(/\r?\n/).filter((l, i) => i === 0 || l.trim() !== '');

  const delimiter = detectDelimiter(lines[0]);
  const columns = parseLine(lines[0], delimiter).map((c) =>
    c.trim().slice(0, maxCellLength),
  );
  const dataLines = lines.slice(1);
  const rows = dataLines.slice(0, maxRows).map((l) =>
    parseLine(l, delimiter).map((c) => c.slice(0, maxCellLength)),
  );
  return {
    columns,
    rows,
    truncated: dataLines.length > maxRows,
  };
}
