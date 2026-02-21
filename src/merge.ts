import yaml from "js-yaml";

/**
 * Apply a JSON Merge Patch (RFC 7396) on top of a target.
 *
 * Per RFC 7396 Section 2:
 * - If the patch is not an object, the result is the patch (full replacement)
 * - If the patch is an object, each key is applied recursively:
 *   - null values mean "delete this key"
 *   - object values are recursively merged
 *   - all other values replace the target key
 * - Arrays are replaced entirely (not merged element-by-element)
 * - Keys in target but not in patch are preserved
 */
export function applyMergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) {
    // RFC 7396: non-object patch replaces target entirely
    return patch;
  }

  const result: Record<string, unknown> = isObject(target) ? { ...target } : {};

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

/**
 * @deprecated Use applyMergePatch instead. Kept for backward compatibility.
 * Assumes both base and override are objects.
 */
export function applyOverride(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  return applyMergePatch(base, override) as Record<string, unknown>;
}

/**
 * Apply a YAML override on top of a YAML base string.
 * Parses both to objects, applies JSON merge patch, serializes back to YAML.
 */
export function applyYamlOverride(baseStr: string, overrideStr: string): string {
  const base = yaml.load(baseStr);
  const override = yaml.load(overrideStr);
  if (!isObject(base)) {
    throw new Error("YAML base must be a mapping (object), not a scalar or array");
  }
  if (!isObject(override)) {
    throw new Error("YAML override must be a mapping (object) for merge strategy. Use replace strategy for non-object overrides.");
  }
  const merged = applyMergePatch(base, override);
  return yaml.dump(merged, { indent: 2, lineWidth: -1 });
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
