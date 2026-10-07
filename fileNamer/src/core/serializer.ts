import type { SerializeInput } from './serializer.types';

export interface SerializeEntry {
  originalName: string;
  finalName: string;
  existsInDest: boolean;
}

const DATE_FORMATS: Record<string, (d: Date) => string> = {
  yyyyMMdd: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  yyyy_MM_DD: (d) => `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}_${String(d.getDate()).padStart(2, '0')}`,
  yyyy-MM-dd: (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  yyyy년 MM월 dd일: (d) => `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`,
};

function placeholderReplacement(
  template: string,
  dateStr: string,
  numberStr: string,
  namePart: string,
  originalFull: string,
  ext: string
): string {
  return template
    .replace(/\{DATE\}/g, dateStr)
    .replace(/\{NUMBER\}/g, numberStr)
    .replace(/\{NAME\}/g, namePart)
    .replace(/\{ORIGINAL\}/g, originalFull)
    .replace(/\{EXT\}/g, ext);
}

export function serializeAll(
  entries: SerializeInput[],
  templatePattern: string,
  padding: number,
  dateFormat: string,
  conflictMode: 'skip' | 'auto'
): SerializeEntry[] {
  const usedNames = new Set<string>();

  return entries.map((e) => {
    const dateStr = e.datePart ? DATE_FORMATS[dateFormat]!(e.datePart) : '';
    let paddedNumber = String(e.number).padStart(padding, '0');
    let result = placeholderReplacement(templatePattern, dateStr, paddedNumber, e.baseWithoutExt || '', e.originalFull, e.ext);

    if (conflictMode === 'auto' && usedNames.has(result)) {
      let attempt = e.number + 1;
      while (usedNames.has(placeholderReplacement(templatePattern, dateStr, String(attempt).padStart(padding, '0'), e.baseWithoutExt || '', e.originalFull, e.ext))) {
        attempt++;
      }
      paddedNumber = String(attempt).padStart(padding, '0');
      result = placeholderReplacement(templatePattern, dateStr, paddedNumber, e.baseWithoutExt || '', e.originalFull, e.ext);
    }

    usedNames.add(result);

    return {
      originalName: e.originalName,
      finalName: result,
      existsInDest: false,
    };
  });
}
