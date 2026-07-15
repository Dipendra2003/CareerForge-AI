export class DegreeDictionary {
  static readonly DEGREE_LEVELS: Record<string, string[]> = {
    "bachelor": ["bachelor", "bachelors", "b.a", "ba", "b.s", "bs", "b.tech", "btech", "b.e", "be", "b.b.a", "bba", "b.c.a", "bca", "undergraduate"],
    "master": ["master", "masters", "m.a", "ma", "m.s", "ms", "m.tech", "mtech", "m.e", "me", "mba", "m.c.a", "mca", "postgraduate", "graduate degree"],
    "doctorate": ["phd", "ph.d", "doctorate", "md", "m.d", "j.d", "jd", "pharm.d"],
    "associate": ["associate", "a.a", "aa", "a.s", "as", "a.a.s", "aas"]
  };

  /**
   * Normalizes a degree string into its canonical level (e.g. "b.tech" -> "bachelor")
   */
  static getCanonicalLevel(degreeText: string): string | null {
    const text = degreeText.toLowerCase();
    
    // Find the highest degree level that matches
    for (const [level, aliases] of Object.entries(this.DEGREE_LEVELS)) {
      if (aliases.some(alias => text.includes(alias))) {
        return level;
      }
    }
    
    return null;
  }

  /**
   * Checks if a candidate's degree meets the required degree level
   */
  static meetsRequirement(candidateDegree: string, requiredDegree: string): boolean {
    const candidateLevel = this.getCanonicalLevel(candidateDegree);
    const requiredLevel = this.getCanonicalLevel(requiredDegree);

    if (!requiredLevel) return true; // If we can't parse JD requirement, assume pass
    if (!candidateLevel) return false;

    const levels = ["associate", "bachelor", "master", "doctorate"];
    const candidateIdx = levels.indexOf(candidateLevel);
    const requiredIdx = levels.indexOf(requiredLevel);

    return candidateIdx >= requiredIdx;
  }
}
