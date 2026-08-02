import { mkdirSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';

/**
 * Crash-safe JSON writes: serialize to a temp file in the same directory, then
 * rename over the target. The original file is never truncated in place, so an
 * interrupted write leaves the previous snapshot intact.
 */
export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, filePath);
}
