import { describe, expect, it } from 'vitest';
import { computeMatchScore } from '@/lib/match';

describe('computeMatchScore', () => {
  it('returns 0 when the student has no skills', () => {
    expect(computeMatchScore([], ['React', 'CSS'])).toBe(0);
  });

  it('returns 0 when the job has no requirements and no location boost applies', () => {
    expect(computeMatchScore(['React'], [])).toBe(0);
  });

  it('scores full overlap as 100', () => {
    expect(computeMatchScore(['React', 'Node'], ['React', 'Node'])).toBe(100);
  });

  it('scores partial overlap as a percentage of matched requirements', () => {
    expect(computeMatchScore(['React'], ['React', 'CSS', 'Node', 'SQL'])).toBe(25);
  });

  it('matches case-insensitively and via substring in either direction', () => {
    expect(computeMatchScore(['react.js'], ['React'])).toBe(100);
    expect(computeMatchScore(['REACT'], ['react.js'])).toBe(100);
  });

  it('adds a 10-point boost when the job location matches the preferred state', () => {
    const score = computeMatchScore(['React'], ['React'], 'Lagos', 'Lagos, Nigeria');
    expect(score).toBe(100); // capped at 100, not 110
    const partial = computeMatchScore(['React'], ['React', 'CSS'], 'Lagos', 'Lagos, Nigeria');
    expect(partial).toBe(60); // 50 + 10
  });

  it('does not add the location boost on a mismatched state', () => {
    const score = computeMatchScore(['React'], ['React', 'CSS'], 'Lagos', 'Abuja, Nigeria');
    expect(score).toBe(50);
  });

  it('handles undefined inputs gracefully', () => {
    expect(computeMatchScore(undefined, undefined)).toBe(0);
  });
});
