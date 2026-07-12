// Minimal RFC 4180-ish CSV serializer -- quotes a field only when it
// contains a comma, quote, or newline (doubling any internal quotes),
// which is all Excel/Sheets/Numbers need to round-trip correctly.
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Neutralizes CSV/formula injection (OWASP): a cell starting with
// =, +, -, @, tab, or CR is a formula trigger in Excel/Sheets when the
// file is opened -- a student name like `=HYPERLINK("http://evil","x")`
// would otherwise execute as a live link/formula for whoever opens the
// export. Prefixing with a single quote keeps the value visible as plain
// text without changing what's exported, matching the standard mitigation.
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvField(neutralizeFormula(cell == null ? '' : String(cell)))).join(','))
    .join('\r\n');
}
