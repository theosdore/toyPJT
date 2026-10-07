import { describe, it, expect } from 'vitest';
import { computeBatchIndex, computePadding } from '../src/core/batch';

describe('computePadding', () => {
  it('zero or one items uses 1 digit', () => {
    expect(computePadding(0)).toBe(1);
    expect(computePadding(1)).toBe(1);
  });
  it('9 items uses 1 digit', () => expect(computePadding(9)).toBe(1));
  it('10 items uses 2 digits', () => expect(computePadding(10)).toBe(2));
  it('1400 items uses 4 digits', () => expect(computePadding(1400)).toBe(4));
  it('100000 items uses 6 digits', () => expect(computePadding(100000)).toBe(6));
});

describe('computeBatchIndex', () => {
  it('groups all files in single group when mode=all', () => {
    const files = [
      { extractDate: new Date('2026-10-08'), originalName: 'b.jpg' },
      { extractDate: new Date('2026-10-08'), originalName: 'a.jpg' },
    ];
    const result = computeBatchIndex(files, 'all');
    expect(result.groupCounts.size).toBe(1);
    expect(result.totalPending).toBe(2);
  });

  it('groups by day effectively', () => {
    const files = [
      { extractDate: new Date('2026-10-08'), originalName: 'a.jpg' },
      { extractDate: new Date('2026-10-07'), originalName: 'b.jpg' },
    ];
    const result = computeBatchIndex(files, 'day');
    expect(result.groupCounts.size).toBe(2);
    expect(result.totalPending).toBe(2);
  });

  it('handles no-date mode grouping', () => {
    const files = [
      { extractDate: null, originalName: 'a.txt' },
      { extractDate: new Date('2026-10-08'), originalName: 'b.jpg' },
    ];
    const result = computeBatchIndex(files, 'no-date');
    expect(result.groupCounts.get('none')).toBe(1);
    expect(result.totalPending).toBe(2);
  });
});
