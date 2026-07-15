import { EngineResult, AuditTrace, ChecklistItem, BulletAnalysis, KeywordFrequency } from "./AuditTrace";

// Engines that contribute to "Parsability" tier
const PARSABILITY_ENGINES = new Set(["Formatting", "Contact", "ATS Compatibility"]);
// Engines that contribute to "Content Match" tier
const CONTENT_ENGINES = new Set(["Keywords & JD Match", "Experience", "Summary", "Education", "Projects", "Achievements"]);

// Map engine names to checklist categories
const ENGINE_CATEGORY_MAP: Record<string, ChecklistItem["category"]> = {
  "Formatting": "Parsability",
  "Contact": "Parsability",
  "ATS Compatibility": "Parsability",
  "Keywords & JD Match": "Keywords",
  "Experience": "Content",
  "Summary": "Content",
  "Education": "Structure",
  "Projects": "Structure",
  "Grammar": "Writing Quality",
  "Achievements": "Content",
  "Writing Quality": "Writing Quality",
  "Bullet Analysis": "Content"
};

export class ScoreCalculator {
  static calculate(engines: EngineResult[]): AuditTrace {
    let overallScore = 0;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const missingSkills: string[] = [];
    const matchedSkills: string[] = [];
    const checklistItems: ChecklistItem[] = [];
    let bulletAnalysis: BulletAnalysis[] = [];
    let keywordFrequency: KeywordFrequency[] = [];
    let quantified = 0;
    let totalBullets = 0;

    // Tier scores
    let parsabilityEarned = 0;
    let parsabilityMax = 0;
    let contentEarned = 0;
    let contentMax = 0;
    
    engines.forEach(result => {
      overallScore += result.score;

      // Tier scoring
      if (PARSABILITY_ENGINES.has(result.engineName)) {
        parsabilityEarned += result.score;
        parsabilityMax += result.maxScore;
      } else if (CONTENT_ENGINES.has(result.engineName)) {
        contentEarned += result.score;
        contentMax += result.maxScore;
      }

      // Extract bullet analysis from BulletAnalysisEngine metadata
      if (result.engineName === "Bullet Analysis" && result.metadata?.bulletAnalysis) {
        bulletAnalysis = result.metadata.bulletAnalysis;
      }

      // Extract keyword frequency from KeywordEngine metadata
      if (result.engineName === "Keywords & JD Match" && result.metadata?.keywordFrequency) {
        keywordFrequency = result.metadata.keywordFrequency;
      }

      // Extract quantification data from ExperienceEngine metadata
      if (result.engineName === "Experience" && result.metadata) {
        quantified = result.metadata.quantifiedAchievements || 0;
        totalBullets = result.metadata.totalBullets || 0;
      }
      
      // Build strengths/weaknesses/skills
      result.passedRules.forEach(rule => {
        strengths.push(rule);
        if (result.engineName === "Keywords & JD Match" && rule.startsWith("Found required skill: ")) {
          matchedSkills.push(rule.replace("Found required skill: ", ""));
        }
      });
      result.failedRules.forEach(fail => {
        if (fail.deduction >= 2) {
          weaknesses.push(fail.reason);
        }
        if (result.engineName === "Keywords & JD Match" && fail.ruleName === "Missing Required Skill") {
           missingSkills.push(fail.reason.replace("Missing required skill: ", ""));
        }
      });

      // Build checklist items from passed + failed rules
      const category = ENGINE_CATEGORY_MAP[result.engineName] || "Content";

      result.passedRules.forEach((rule, idx) => {
        checklistItems.push({
          id: `${result.engineName}-pass-${idx}`,
          category,
          label: rule,
          status: "pass",
          deduction: 0,
          engineName: result.engineName
        });
      });

      result.failedRules.forEach((fail, idx) => {
        checklistItems.push({
          id: `${result.engineName}-fail-${idx}`,
          category,
          label: fail.ruleName,
          status: fail.deduction >= 2 ? "fail" : "warning",
          detail: fail.reason,
          deduction: fail.deduction,
          engineName: result.engineName,
          suggestedFix: fail.suggestedFix
        });
      });
    });

    // Ensure score does not drop below 0 or above 100
    overallScore = Math.min(100, Math.max(0, Math.round(overallScore)));

    // Compute tier percentages
    const parsabilityScore = parsabilityMax > 0 ? Math.round((parsabilityEarned / parsabilityMax) * 100) : 100;
    const contentMatchScore = contentMax > 0 ? Math.round((contentEarned / contentMax) * 100) : 0;

    // Word count and recommended range — will be populated from rawText externally
    const quantificationRate = {
      quantified,
      total: totalBullets,
      percentage: totalBullets > 0 ? Math.round((quantified / totalBullets) * 100) : 0
    };

    return {
      overallScore,
      parsabilityScore,
      contentMatchScore,
      engines,
      strengths,
      weaknesses,
      missingSkills,
      matchedSkills,
      bulletAnalysis,
      checklistItems,
      keywordFrequency,
      quantificationRate,
      resumeWordCount: 0,        // Set externally after calculation
      recommendedWordRange: [400, 800] // Default, overridden externally
    };
  }
}
