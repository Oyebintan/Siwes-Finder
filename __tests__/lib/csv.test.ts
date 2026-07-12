import { describe, expect, it } from 'vitest';
import { toCsv } from '@/lib/csv';

describe('toCsv', () => {
  it('joins rows with CRLF and cells with commas', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d');
  });

  it('quotes a field containing a comma, doubling nothing else', () => {
    expect(toCsv([['Ada, Lovelace', 'x']])).toBe('"Ada, Lovelace",x');
  });

  it('quotes and escapes a field containing a double quote', () => {
    expect(toCsv([['She said "hi"']])).toBe('"She said ""hi"""');
  });

  it('quotes a field containing a newline', () => {
    expect(toCsv([['line1\nline2']])).toBe('"line1\nline2"');
  });

  it('renders null/undefined as an empty cell', () => {
    expect(toCsv([[null, undefined, 'x']])).toBe(',,x');
  });

  it('stringifies numbers and booleans', () => {
    expect(toCsv([[1, true, false]])).toBe('1,true,false');
  });
});
