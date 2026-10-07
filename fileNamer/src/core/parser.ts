export interface ExtractResult {
  date: Date | null;
  matchedRaw?: string;
}

const FORMATS: [string, RegExp, (m: RegExpExecArray) => Date | null][] = [
  ['yyyy-MM-dd', /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/, parseStandard],
  ['yyyyMMdd', /^\d{8}/, parseCompact],
  ['yyyy-MM-dd_HH:mm:ss', /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])_[0-1]?\d{1,2}:([0-5]\d):([0-5]\d)/, parseDateTimeBracket],
  ['yyyy-MM-dd_HHmmss', /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])_(\d{2,8})/, parseDateTimeUnderscore],
  ['yyyy년 MM월 dd일', /^(\d{4})년\s*(0?[1-9]|1[0-2])월\s*(0?[1-9]|[12]\d|3[01])일/, parseKorean],
  ['MM-dd-yyyy', /(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-(\d{4})/, parseMdy],
  ['MM_dd_yyyy', /(0[1-9]|1[0-2])_(0[1-9]|[12]\d|3[01])_(\d{4})/, parseMdyUnderscore],
  ['dd-MM-yyyy', /(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-(\d{4})/, parseDmy],
];

function parseStandard(m: RegExpExecArray): Date | null {
  const [_, y, M, d] = m;
  const date = new Date(+y, +M - 1, +d);
  if (date.getFullYear() !== +y || date.getMonth() !== +M - 1) return null;
  return date;
}

function parseCompact(m: RegExpExecArray): Date | null {
  const [y] = m;
  const date = new Date(+y);
  if (date.getFullYear() !== +y.slice(0, 4)) return null;
  return date;
}

function parseDateTimeBracket(m: RegExpExecArray): Date | null {
  const [_, y, M, d, hh, mm, ss] = m;
  const date = new Date(+y, +M - 1, +d, +hh, +mm, +ss);
  return date;
}

function parseDateTimeUnderscore(m: RegExpExecArray): Date | null {
  const [_, y, M, d, rest] = m;
  const dt = new Date(+y, +M - 1, +d);
  const hour = Math.floor((parseInt(rest, 10) % 10000) / 100);
  const minute = parseInt(rest, 10) % 100;
  if (hour > 23 || minute > 59) return null;
  dt.setHours(hour, minute, 0, 0);
  return dt;
}

function parseKorean(m: RegExpExecArray): Date | null {
  const [_, y, M, d] = m;
  const date = new Date(+y, +M - 1, +d);
  if (date.getFullYear() !== +y || date.getMonth() !== +M - 1) return null;
  return date;
}

function parseMdy(m: RegExpExecArray): Date | null {
  const [_, M, d, y] = m;
  const date = new Date(+y, +M - 1, +d);
  if (date.getFullYear() !== +y || date.getMonth() !== +M - 1) return null;
  return date;
}

function parseMdyUnderscore(m: RegExpExecArray): Date | null {
  const [_, M, d, y] = m;
  return new Date(+y, +M - 1, +d);
}

function parseDmy(m: RegExpExecArray): Date | null {
  const [_, d, M, y] = m;
  const date = new Date(+y, +M - 1, +d);
  if (date.getFullYear() !== +y || date.getMonth() !== +M - 1) return null;
  return date;
}

export function extractDate(fileName: string): ExtractResult {
  for (const [pattern, regex, parser] of FORMATS) {
    const match = regex.exec(fileName);
    if (match && parser(match)) {
      return { date: parser(match), matchedRaw: match[0] };
    }
  }
  return { date: null };
}
