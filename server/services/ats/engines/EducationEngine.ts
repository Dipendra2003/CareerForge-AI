import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";
import { DegreeDictionary } from "../registry/DegreeDictionary";

export class EducationEngine extends BaseEngine {
  engineName = "Education";
  maxScore = 5;

  evaluate(resume: StructuredResume, jd: StructuredJD, _rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    if (!resume.education || resume.education.length === 0) {
      score = 0;
      failed.push({ ruleName: "Missing Education", reason: "No education history found", deduction: 5 });
      recs.push("Add an education section to your resume.");
      return this.createResult(score, passed, failed, recs);
    }

    passed.push("Has Education Section");
    
    // Evaluate degree requirement using DegreeDictionary
    const requiredDegree = jd.education?.minimumDegree?.toLowerCase();
    if (requiredDegree) {
      let degreeMatch = false;
      resume.education.forEach(edu => {
        if (edu.degree && DegreeDictionary.meetsRequirement(edu.degree, requiredDegree)) {
          degreeMatch = true;
        }
      });

      if (degreeMatch) {
        passed.push("Meets Degree Requirement");
      } else {
        score -= 2;
        failed.push({ ruleName: "Degree Requirement", reason: `Does not explicitly meet requirement for ${requiredDegree}`, deduction: 2, confidence: "High", evidence: `No equivalent to ${requiredDegree} found in education`, expectedGain: 2, suggestedFix: `Ensure your degree matches the required: ${requiredDegree}` });
        recs.push(`Ensure your degree matches the required: ${requiredDegree}`);
      }
    }

    return this.createResult(score, passed, failed, recs);
  }
}

