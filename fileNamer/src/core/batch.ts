import { type GroupingMode } from './batch.types';

export function computePadding(count: number): number {
  const thresholds = [9, 99, 999, 9999, 99999, 999999];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (count < thresholds[i]) return i + 1;
  }
  return 7;
}

export interface BatchResultEntry {
  entryIndex: number;
  groupKey: string;
  groupNumber: number;
}

export interface BatchResult {
  entries: BatchResultEntry[];
  groupCounts: Map<string, number>;
  paddingPerGroup: Map<string, number>;
  totalPending: number;
}

function getGroupKey(
  entry: { extractDate: Date | null; originalName: string },
  mode: GroupingMode,
  patternFilter?: string
): string | null {
  switch (mode) {
    case 'all':
      return 'all-' + Math.random().toString(36).slice(2, 9);
    case 'day':
    case 'creation': {
      const d = entry.extractDate || new Date(entry.originalName);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    case 'no-date':
      return entry.extractDate ? null : 'none';
    case 'pattern':
      if (!patternFilter) return 'all';
      const included = entry.originalName.toLowerCase().includes(patternFilter.toLowerCase());
      return included ? patternFilter : 'excluded';
    case 'byExt':
      const ext = entry.originalName.split('.').pop()?.toLowerCase() ?? 'unknown';
      return `ext-${ext}`;
    case 'prefix': {
      const prefixLen = 3;
      return entry.originalName.slice(0, prefixLen).toLowerCase();
    }
    default:
      return 'other';
  }
}

export function computeBatchIndex(
  entries: Array<{
    extractDate: Date | null;
    originalName: string;
    originalPath: string;
  }>,
  mode: GroupingMode,
  patternFilter?: string,
  extensionFilters?: readonly string[],
  sortFn?: (a: typeof entries[0], b: typeof entries[0]) => number
): BatchResult {
  let filtered = [...entries];

  if (extensionFilters && extensionFilters.length > 0) {
    filtered = filtered.filter((e) => {
      const ext = e.originalName.split('.').pop()?.toLowerCase();
      return ext ? extensionFilters!.includes(ext) : false;
    });
  }

  if (sortFn) {
    filtered.sort(sortFn);
  } else {
    filtered.sort((a, b) => a.originalName.localeCompare(b.originalName));
  }

  const grouped: Map<string, BatchResultEntry[]> = new Map();

  for (let i = 0; i < filtered.length; i++) {
    const key = getGroupKey(filtered[i], mode, patternFilter);
    if (key === null) continue;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push({
      entryIndex: i,
      groupKey: key,
      groupNumber: 0,
    });
  }

  const groupCounts = new Map<string, number>();
  const paddingPerGroup = new Map<string, number>();

  for (const [key, arr] of grouped.entries()) {
    groupCounts.set(key, arr.length);
    paddingPerGroup.set(key, computePadding(arr.length));
  }

  const padded = new Map<string, Map<number, number>>();
  for (const [key, arr] of grouped.entries()) {
    const perGroup = new Map<number, number>();
    arr.forEach((item) => {
      item.groupNumber = ++perGroup.get(item.entryIndex) || 0;
    });
    padded.set(key, perGroup);
  }

  const sortedEntries = Array.from(grouped.keys()).sort();
  const allSorted: BatchResultEntry[] = [];

  for (const key of sortedEntries) {
    const arr = grouped.get(key)!;
    const perGroup = padded.get(key)!;
    arr.forEach((item) => {
      allSorted.push({ ...item });
    });
  }

  return {
    entries: allSorted,
    groupCounts,
    paddingPerGroup,
    totalPending: filtered.length,
  };
}
