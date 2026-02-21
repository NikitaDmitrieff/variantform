import { normalize, isAbsolute } from "node:path";

const VALID_VARIANT_NAME = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Validate a variant name for use in filesystem paths.
 * Rejects path traversal, spaces, and special characters.
 */
export function validateVariantName(name: string): void {
  if (!VALID_VARIANT_NAME.test(name)) {
    throw new Error(
      `invalid variant name: "${name}". Use alphanumeric, dots, hyphens, underscores.`
    );
  }
}

/**
 * Validate that a surface path is safe (no traversal, no absolute paths).
 * Called during config loading to reject malicious .variantform.yaml entries.
 */
export function validateSurfacePath(path: string): void {
  if (isAbsolute(path)) {
    throw new Error(`Surface path must be relative, got absolute: "${path}"`);
  }

  // Normalize and check for traversal
  const normalized = normalize(path);
  if (normalized.startsWith("..")) {
    throw new Error(`Surface path must not escape project root: "${path}"`);
  }

  // Also reject raw .. segments in the original (normalize might not catch all forms)
  if (path.split("/").some((segment) => segment === "..")) {
    throw new Error(`Surface path must not contain "..": "${path}"`);
  }
}

/**
 * Validate that a glob pattern is confined to the project root.
 */
export function validateGlobPattern(pattern: string): void {
  if (isAbsolute(pattern)) {
    throw new Error(`Glob pattern must be relative: "${pattern}"`);
  }
  if (pattern.split("/").some((segment) => segment === "..")) {
    throw new Error(`Glob pattern must not contain "..": "${pattern}"`);
  }
}
