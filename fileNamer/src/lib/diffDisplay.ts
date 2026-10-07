export function diffHtml(original: string, modified: string): string {
  const merged = document.createElement('pre');
  merged.textContent = modified;
  const originalText = original;
  const diff = require('diff-symbols').diff(originalText, merged.textContent || modified).join('');
  const escaped = diff.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="diff-block">${escaped}</div>`;
}

export interface DiffRow {
  originalName: string;
  finalName: string;
}
