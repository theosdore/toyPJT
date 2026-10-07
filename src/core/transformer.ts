import type { TextOperationSettings } from './transformer.types';

export function applyTransformations(
  originalName: string,
  ops: Partial<TextOperationSettings>
): string {
  let result = originalName;

  if (ops.toLowerCase) {
    result = result.toLowerCase();
  }
  if (ops.toUpperCase) {
    result = result.toUpperCase();
  }
  if (ops.titleCase) {
    result = result.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  }
  if (ops.trimWhitespace) {
    result = result.trim();
  }
  if (ops.spaceToUnderscore) {
    result = result.replace(/\s+/g, '_');
  }
  if (replaceWith := ops.replaceWith) {
    for (const r of replaceWith) {
      result = result.split(r.find).join(r.replace);
    }
  }
  if (prefix := ops.prefix) {
    result = prefix + result;
  }
  if (suffix := ops.suffix) {
    result = result + suffix;
  }
  if (deleteText := ops.deleteText) {
    const regex = new RegExp(deleteText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, '');
  }
  if (changeExtension := ops.changeExtension) {
    result = result.replace(/\.[^.]+$/, changeExtension);
  }

  return result;
}
