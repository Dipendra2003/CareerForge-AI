import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class ATSCompatibilityEngine extends BaseEngine {
  engineName = "ATS Compatibility";
  maxScore = 0; // Purely informational/penalty-based or diagnostic

  evaluate(resume: StructuredResume, _jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    // Length check
    if (rawText.length > 15000) {
      failed.push({ ruleName: "Excessive Length", reason: "Resume is extremely long, potentially exceeding parser limits", deduction: 0, confidence: "High", evidence: `Text length is ${rawText.length}`, expectedGain: 0, suggestedFix: "Shorten your resume. Ensure it is no longer than 2 pages." });
      recs.push("Shorten your resume. Ensure it is no longer than 2 pages.");
    } else {
      passed.push("Good resume length");
    }

    // Name parse check
    if (!resume.personalInfo?.firstName && !resume.personalInfo?.lastName) {
      failed.push({ ruleName: "Name Parsing Failed", reason: "Could not definitively parse a name from the resume", deduction: 0, confidence: "High", evidence: "No firstName or lastName extracted", expectedGain: 0, suggestedFix: "Ensure your name is clearly placed at the very top of the resume." });
      recs.push("Ensure your name is clearly placed at the very top of the resume.");
    }

    return this.createResult(score, passed, failed, recs);
  }
}
