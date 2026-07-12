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

  it('neutralizes a leading = to prevent formula injection', () => {
    expect(toCsv([['=HYPERLINK("http://evil.com","click")']])).toBe(
      '"\'=HYPERLINK(""http://evil.com"",""click"")"'
    );
  });

  it('neutralizes leading +, -, @, tab, and CR the same way', () => {
    expect(toCsv([['+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd']])).toBe(
      "'+1+1,'-2+3,'@SUM(A1),'\tcmd,'\rcmd"
    );
  });

  it('does not touch a value that merely contains (not starts with) a formula character', () => {
    expect(toCsv([['Grade: A+', 'user@example.com']])).toBe('Grade: A+,user@example.com');
  });

  it('a leading minus in an ordinary negative number is also neutralized (accepted trade-off)', () => {
    // toCsv only ever receives already-stringified display values in this
    // codebase (see school-students CSV export), so this never applies to
    // an actual numeric cell -- documented here so the behavior is explicit.
    expect(toCsv([[-5]])).toBe("'-5");
  });
});
