import picomatch from "picomatch";

/**
 * Check if a file path matches a surface pattern.
 * Uses picomatch for proper glob semantics consistent with fast-glob.
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  return picomatch.isMatch(filePath, pattern);
}
