import { describe, it, expect } from 'vitest';
import { serializeAll, SerializeInput } from '../src/core/serializer';

describe('serialize', () => {
  it('basic date-number template works', () => {
    const entries: SerializeInput[] = [
      { originalName: 'IMG_001.jpg', originalPath: '/tmp/f1', ext: '.jpg', baseWithoutExt: 'IMG_001', originalFull: 'IMG_001.jpg', datePart: new Date('2026-10-07'), number: 0 },
      { originalName: 'IMG_002.png', originalPath: '/tmp/f2', ext: '.png', baseWithoutExt: 'IMG_002', originalFull: 'IMG_002.png', datePart: new Date('2026-10-07'), number: 1 },
    ];
    const result = serializeAll(entries, '{DATE}_{NUMBER}.{EXT}', 2, 'yyyy-MM-dd', 'auto');
    expect(result[0].newName).toBe('2026-10-07_01.jpg');
    expect(result[1].newName).toBe('2026-10-07_02.png');
  });

  it('conflict mode auto increments duplicate names', () => {
    const ent: SerializeInput = {
      originalName: 'a.txt', originalPath: '/tmp', ext: '.txt', baseWithoutExt: 'a', originalFull: 'a.txt', datePart: null, number: 0,
    };
    const results = serializeAll([ent, ent], '{NAME}_{NUMBER}.{EXT}', 2, 'yyyy-MM-dd', 'auto');
    expect(results[0].finalName).toBe('a.txt');
    expect(results[1].finalName).not.toBe(results[0].finalName);
  });

  it('handles no date with fallback empty', () => {
    const ent: SerializeInput = {
      originalName: 'no_date_file.jpg', originalPath: '/tmp', ext: '.jpg', baseWithoutExt: 'no_date_file', originalFull: 'no_date_file.jpg', datePart: null, number: 0,
    };
    const result = serializeAll([ent], '{DATE}_{NUMBER}.{EXT}', 3, 'yyyy-MM-dd', 'auto');
    expect(result[0].finalName).toBe('_0.jpg');
  });

  it('different extensions preserved', () => {
    const entries: SerializeInput[] = [
      { originalName: 'f1.JPG', originalPath: '/tmp', ext: '.JPG', baseWithoutExt: 'f1', originalFull: 'f1.JPG', datePart: new Date(), number: 0 },
      { originalName: 'f2.jpeg', originalPath: '/tmp', ext: '.jpeg', baseWithoutExt: 'f2', originalFull: 'f2.jpeg', datePart: new Date(), number: 1 },
    ];
    const r = serializeAll(entries, '{NAME}_V{NUMBER}.{EXT}', 2, 'yyyy-MM-dd', 'auto');
    expect(r[0].finalName).toContain('.JPG');
    expect(r[1].finalName).toContain('.jpeg');
  });

  it('date format yyyyMMdd maps correctly', () => {
    const ent: SerializeInput = {
      originalName: 'test.mp4', originalPath: '/tmp', ext: '.mp4', baseWithoutExt: 'test', originalFull: 'test.mp4', datePart: new Date('2026-12-31'), number: 0,
    };
    const r = serializeAll([ent], '{DATE}/{NUMBER}.{EXT}', 2, 'yyyyMMdd', 'auto');
    expect(r[0].finalName).toBe('20261231_01.mp4');
  });
});
