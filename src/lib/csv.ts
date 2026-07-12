// Minimal RFC 4180-ish CSV serializer -- quotes a field only when it
// contains a comma, quote, or newline (doubling any internal quotes),
// which is all Excel/Sheets/Numbers need to round-trip correctly.
function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsvField(cell == null ? '' : String(cell))).join(',')).join('\r\n');
}
