// Skill/requirement overlap between a student profile and a job listing,
// expressed as a 0-100 percentage. Matching is substring-based in both
// directions (case-insensitive) so "React" and "React.js" count as the same
// skill without needing an exact string match.
export function computeMatchScore(
  studentSkills: string[] | undefined,
  jobRequirements: string[] | undefined,
  preferredState?: string,
  jobLocation?: string
): number {
  const skills = (studentSkills || []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const reqs = (jobRequirements || []).map((r) => r.trim().toLowerCase()).filter(Boolean);

  let score = 0;
  if (reqs.length > 0 && skills.length > 0) {
    const matched = reqs.filter((req) => skills.some((skill) => skill.includes(req) || req.includes(skill)));
    score = Math.round((matched.length / reqs.length) * 100);
  }

  if (preferredState && jobLocation && jobLocation.toLowerCase().includes(preferredState.trim().toLowerCase())) {
    score = Math.min(100, score + 10);
  }

  return score;
}
