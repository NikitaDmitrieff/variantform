/**
 * Check if a file path matches a surface pattern.
 * Supports exact matches and basic glob patterns (* and **).
 */
export function matchesPattern(filePath: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return filePath === pattern;
  }

  const regexStr = "^" + pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "{{GLOBSTAR}}")
    .replace(/\*/g, "[^/]*")
    .replace(/\{\{GLOBSTAR\}\}/g, ".*") + "$";

  return new RegExp(regexStr).test(filePath);
}
