import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";
import { FluffDictionary } from "../utils/FluffDictionary";

export class SummaryEngine extends BaseEngine {
  engineName = "Summary";
  maxScore = 5;

  evaluate(resume: StructuredResume, _jd: StructuredJD, _rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    if (!resume.summary || resume.summary.length < 50) {
      score -= 5;
      failed.push({ ruleName: "Weak Summary", reason: "Summary is missing or too short", deduction: 5, confidence: "High", evidence: resume.summary ? `Summary is only ${resume.summary.length} characters` : "No summary section found", expectedGain: 5, suggestedFix: "Add a professional summary of at least 50 characters." });
      recs.push("Add a professional summary of at least 50 characters.");
    } else {
      const fluffCount = FluffDictionary.countFluff(resume.summary);
      if (fluffCount > 2) {
        score -= 2;
        failed.push({ ruleName: "Fluff Words Detected", reason: "Summary contains too many generic buzzwords", deduction: 2, confidence: "Medium", evidence: `Found ${fluffCount} fluff words in summary`, expectedGain: 2, suggestedFix: "Remove generic buzzwords (e.g. 'hard worker', 'team player'). Focus on specific, measurable value you bring." });
        recs.push("Remove generic buzzwords (e.g. 'hard worker', 'team player') from your summary.");
      } else {
        passed.push("Strong Summary");
      }
    }

    return this.createResult(score, passed, failed, recs);
  }
}

