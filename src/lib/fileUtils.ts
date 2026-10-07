export function getExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? '.' + filename.slice(idx + 1).toLowerCase() : '';
}

export function baseWithoutExt(filename: string): string {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

export function isDirectory(entry: { isDirectory: boolean }): entry is { isDirectory: true } {
  return entry.isDirectory;
}

export function isFile(entry: { isDirectory: boolean }): entry is { isDirectory: false } {
  return !entry.isDirectory;
}
