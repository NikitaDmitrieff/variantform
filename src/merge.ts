import yaml from "js-yaml";

/**
 * Apply an override on top of a base object using JSON Merge Patch (RFC 7396) semantics.
 *
 * Rules:
 * - Override keys are deep-merged into base
 * - null values in override mean "delete this key"
 * - Arrays are replaced entirely (not merged element-by-element)
 * - Nested objects are recursively merged
 * - Keys in base but not in override are preserved
 */
export function applyOverride(
  base: Record<string, unknown>,
  override: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...base };

  for (const [key, overrideValue] of Object.entries(override)) {
    if (overrideValue === null) {
      // RFC 7396: null means delete
      delete result[key];
    } else if (
      isObject(overrideValue) &&
      isObject(result[key])
    ) {
      // Both are objects: recurse
      result[key] = applyOverride(
        result[key] as Record<string, unknown>,
        overrideValue as Record<string, unknown>
      );
    } else {
      // Scalar, array, or type mismatch: override wins
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Apply a YAML override on top of a YAML base string.
 * Parses both to objects, applies JSON merge, serializes back to YAML.
 */
export function applyYamlOverride(baseStr: string, overrideStr: string): string {
  const base = yaml.load(baseStr);
  const override = yaml.load(overrideStr);
  if (!isObject(base) || !isObject(override)) {
    throw new Error("YAML surfaces must be mappings (objects), not scalars or arrays");
  }
  const merged = applyOverride(base, override);
  return yaml.dump(merged, { indent: 2, lineWidth: -1 });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
