import { describe, it, expect } from 'vitest';
import { applyTransformations, TextOperationSettings } from '../src/core/transformer';

describe('transformer', () => {
  it('applies lowercase to full string', () => {
    expect(applyTransformations('Hello.PNG', { lowercase: true })).toBe('hello.png');
  });

  it('applies uppercase to full string', () => {
    expect(applyTransformations('hello.png', { uppercase: true })).toBe('HELLO.PNG');
  });

  it('handles titleCase on multi-word names', () => {
    expect(applyTransformations('my_photo_01.jpg', { titleCase: true })).toBe('My Photo 01.Jpg');
  });

  it('strips leading/trailing whitespace', () => {
    expect(applyTransformations('  img_01.jpg  ', { trimWhitespace: true })).toBe('img_01.jpg');
  });

  it('replaces spaces with underscores', () => {
    expect(applyTransformations('IMG 01 JPG', { spaceToUnderscore: true })).toBe('IMG_01_JPG');
  });

  it('supports multiple replace operations', () => {
    expect(applyTransformations('IMG_01.JPG', {
      replaceWith: [{ find: '.JPG', replace: '.jpg' }]
    })).toBe('IMG_01.jpg');
  });

  it('adds prefix to beginning', () => {
    expect(applyTransformations('file.txt', { prefix: 'backup_' })).toBe('backup_file.txt');
  });

  it('adds suffix to end', () => {
    expect(applyTransformations('file.txt', { suffix: '_bak' })).toBe('file.txt_bak');
  });

  it('deletes matched text portion', () => {
    expect(applyTransformations('IMG_01.jpg', { deleteText: 'IMG' })).toBe('_01.jpg');
  });

  it('changes extension to new one', () => {
    expect(applyTransformations('photo.JPEG', { changeExtension: '.jpg' })).toBe('photo.jpg');
  });

  it('combines uppercase + changeExtension', () => {
    expect(applyTransformations('photo.jpeg', { uppercase: true, changeExtension: '.png' })).toBe('PHOTO.PNG');
  });

  it('handles empty ops unchanged', () => {
    expect(applyTransformations('photo.jpg', {})).toBe('photo.jpg');
  });

  it('handles null/undefined in options without crashing', () => {
    expect(applyTransformations('test.txt', undefined as any)).toBe('test.txt');
  });
});
