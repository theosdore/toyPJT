import describe, it, expect from 'vitest';

import { extractDate } from '../src/core/parser';

describe('parse', () => {
  it('parses ISO date yyyy-MM-dd', () => {
    const result = extractDate('IMG_2026-10-07.jpg');
    expect(result.date).toEqual(new Date('2026-10-07'));
    expect(result.date.getFullYear()).toBe(2026);
    expect(result.date.getMonth()).toBe(9);
    expect(result.date.getDate()).toBe(7);
  });

  it('parses compact date yyyyMMdd', () => {
    const result = extractDate('FILE_20261007.png');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('parses datetime with seconds yyyy-MM-dd HH:mm:ss', () => {
    const result = extractDate('PHOTO_2026-10-07_143000.JPG');
    expect(result.date).toEqual(new Date('2026-10-07T14:30:00'));
  });

  it('parses datetime underscore separator', () => {
    const result = extractDate('LOGO_2026-10-07_143005.PNG');
    expect(result.date).toEqual(new Date('2026-10-07T14:30:05'));
  });

  it('parses Korean format 년 월 일', () => {
    const result = extractDate('사진_2026년10월7일.jpg');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('parses English month abbreviation Jan 5, 2024', () => {
    const result = extractDate('MEETING_Jan5,2024.txt');
    expect(result.date).toEqual(new Date('2024-01-05'));
  });

  it('parses MM-dd-yyyy format', () => {
    const result = extractDate('REPORT_10-07-2026.pdf');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('handles trailing content after timestamp', () => {
    const result = extractDate('IMG_2026-10-07_extra.jpg');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('returns null when no date pattern matched', () => {
    expect(extractDate('readme.txt').date).toBeNull();
    expect(extractDate('NO_DATE_FILE.md').date).toBeNull();
    expect(extractDate('justAName.vue').date).toBeNull();
  });

  it('rejects invalid dates like 2026-02-30', () => {
    expect(extractDate('INVALID_DATE_2026-02-30.mp4').date).toBeNull();
  });

  it('extracts YYYY_MM_DD style', () => {
    const result = extractDate('IMG_2026_10_07.jpg');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('extracts dd-MM-yyyy format', () => {
    const result = extractDate('EVENT_07-10-2026.jpg');
    expect(result.date).toEqual(new Date('2026-10-07'));
  });

  it('identifies year-first and sorts by it by default', () => {
    const files = [
      extractDate('BACKUP_20251225.zip'),
      extractDate('SCREENSHOT_20260101.png'),
      extractDate('LATEST_20260615.mov'),
    ];
    expect(files[0].date.getFullYear()).toBe(2025);
    expect(files[1].date.getFullYear()).toBe(2026);
    expect(files[2].date.getFullYear()).toBe(2026);
    expect(files[2].date.getMonth()).toBe(5);
  });

  it('preserves epoch-like short numeric in name without date suffix as null', () => {
    expect(extractDate('STEP_42_shot.png').date).toBeNull();
  });

  it('returns null for filename that only has digits and underscore', () => {
    expect(extractDate('12345_67890.mp4').date).toBeNull();
  });
});
