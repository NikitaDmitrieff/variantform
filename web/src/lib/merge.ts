/**
 * Client-side merge logic for live preview.
 * Copied from src/merge.ts — pure TypeScript, no Node dependencies.
 * Implements RFC 7396 JSON Merge Patch.
 */

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) {
    return patch;
  }

  const result: Record<string, unknown> = isObject(target)
    ? { ...target }
    : {};

  for (const [key, patchValue] of Object.entries(patch)) {
    if (patchValue === null) {
      delete result[key];
    } else if (isObject(patchValue) && isObject(result[key])) {
      result[key] = applyMergePatch(result[key], patchValue);
    } else {
      result[key] = patchValue;
    }
  }

  return result;
}
