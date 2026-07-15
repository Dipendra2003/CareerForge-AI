import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";
import { FluffDictionary } from "../utils/FluffDictionary";

const RESUME_CLICHES = [
  "team player", "hard worker", "detail-oriented", "detail oriented",
  "think outside the box", "go-getter", "self-starter", "self starter",
  "results-driven", "results driven", "highly motivated", "passionate",
  "excellent communication skills", "good communication skills",
  "strong work ethic", "works well under pressure", "fast learner",
  "quick learner", "proactive", "go above and beyond",
  "wear many hats", "hit the ground running", "innovative thinker",
  "people person", "multitasker", "can-do attitude"
];

export class RepetitionEngine extends BaseEngine {
  engineName = "Writing Quality";
  maxScore = 5;

  evaluate(resume: StructuredResume, _jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed: string[] = [];
    const failed: any[] = [];
    const recs: string[] = [];

    // 1. Collect all bullets
    const allBullets: string[] = [];
    resume.experience?.forEach(exp => {
      exp.achievements?.forEach(a => allBullets.push(a.toLowerCase().trim()));
    });
    resume.projects?.forEach(proj => {
      if (proj.description) {
        proj.description.split('\n').filter(l => l.trim().length > 10).forEach(l => allBullets.push(l.toLowerCase().trim()));
      }
    });

    // 2. Detect repeated phrases (3+ word n-grams appearing 2+ times)
    const phraseCount: Record<string, number> = {};
    allBullets.forEach(bullet => {
      const words = bullet.replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2);
      for (let i = 0; i <= words.length - 3; i++) {
        const ngram = words.slice(i, i + 3).join(' ');
        // Skip very common filler phrases
        if (ngram.length < 10) continue;
        phraseCount[ngram] = (phraseCount[ngram] || 0) + 1;
      }
    });

    const repeatedPhrases = Object.entries(phraseCount)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (repeatedPhrases.length > 0) {
      score -= Math.min(2, repeatedPhrases.length);
      const examples = repeatedPhrases.map(([phrase, count]) => `"${phrase}" (${count}x)`).join(', ');
      failed.push({
        ruleName: "Repeated Phrases",
        reason: `Found ${repeatedPhrases.length} repeated phrase(s) across bullets`,
        deduction: Math.min(2, repeatedPhrases.length),
        confidence: "Medium" as const,
        evidence: examples,
        expectedGain: Math.min(2, repeatedPhrases.length),
        suggestedFix: "Vary your language across bullet points. Each bullet should feel distinct."
      });
      recs.push("Vary your language across bullet points to avoid repetition.");
    } else {
      passed.push("No Repeated Phrases");
    }

    // 3. Detect clichés across entire resume
    const lowerRaw = rawText.toLowerCase();
    const foundCliches: string[] = [];
    RESUME_CLICHES.forEach(cliche => {
      if (lowerRaw.includes(cliche)) {
        foundCliches.push(cliche);
      }
    });

    if (foundCliches.length > 0) {
      const deduction = Math.min(2, foundCliches.length);
      score -= deduction;
      failed.push({
        ruleName: "Resume Clichés",
        reason: `Found ${foundCliches.length} overused cliché(s)`,
        deduction,
        confidence: "Medium" as const,
        evidence: foundCliches.map(c => `"${c}"`).join(', '),
        expectedGain: deduction,
        suggestedFix: "Replace clichés with specific, measurable statements. Instead of 'team player', say 'Collaborated with 5-person cross-functional team to ship feature X'."
      });
      recs.push("Replace clichés with specific, measurable statements.");
    } else {
      passed.push("No Clichés Detected");
    }

    // 4. Detect first-person pronouns (I, me, my, we)
    const pronounMatches = rawText.match(/\b(I|me|my|myself|we|our)\b/gi);
    const pronounCount = pronounMatches ? pronounMatches.length : 0;
    if (pronounCount > 3) {
      score -= 1;
      failed.push({
        ruleName: "First-Person Pronouns",
        reason: `Found ${pronounCount} first-person pronouns (I, me, my)`,
        deduction: 1,
        confidence: "Medium" as const,
        evidence: `${pronounCount} occurrences of I/me/my/we/our`,
        expectedGain: 1,
        suggestedFix: "Remove first-person pronouns. Start bullets with action verbs instead of 'I developed...'."
      });
      recs.push("Remove first-person pronouns from bullet points.");
    } else {
      passed.push("No Excessive Pronouns");
    }

    if (score === this.maxScore) {
      passed.push("Clean Writing Quality");
    }

    return this.createResult(score, passed, failed, recs, {
      repeatedPhrases: repeatedPhrases.map(([phrase, count]) => ({ phrase, count })),
      foundCliches,
      pronounCount
    });
  }
}
