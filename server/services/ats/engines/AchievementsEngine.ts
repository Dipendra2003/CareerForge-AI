import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class AchievementsEngine extends BaseEngine {
  engineName = "Achievements";
  maxScore = 2;

  evaluate(resume: StructuredResume, _jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    const hasAchievements = resume.achievements && resume.achievements.length > 0;
    const hasCertifications = resume.certifications && resume.certifications.length > 0;
    
    // Fallback: Check raw text if AI missed extracting it properly
    const lowerText = rawText.toLowerCase();
    const hasRawAchievements = lowerText.includes("award") || lowerText.includes("scholarship") || lowerText.includes("hackathon") || lowerText.includes("certif") || lowerText.includes("winner");

    if (hasAchievements) {
      passed.push("Has Dedicated Achievements/Awards Section");
    } else if (hasCertifications) {
      passed.push("Has Certifications acting as Achievements");
    } else if (hasRawAchievements) {
      passed.push("Has Implicit Achievements");
    } else {
      score -= 2;
      failed.push({ ruleName: "No Dedicated Achievements", reason: "Missing specific awards or achievements section", deduction: 2, confidence: "Medium", evidence: "No achievements or certifications found", expectedGain: 2, suggestedFix: "Consider adding a dedicated 'Awards & Achievements' or 'Certifications' section if you have notable recognitions." });
      recs.push("Consider adding a dedicated 'Awards & Achievements' or 'Certifications' section if you have notable recognitions.");
    }

    return this.createResult(score, passed, failed, recs);
  }
}

