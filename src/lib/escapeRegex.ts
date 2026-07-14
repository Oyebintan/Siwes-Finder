// Escapes a string for safe interpolation into a RegExp -- required
// whenever user input becomes part of a pattern (search terms, email
// lookups, school-name matching), otherwise `.*` or `(` in the input
// changes the query's meaning or throws.
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
