import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class ContactEngine extends BaseEngine {
  engineName = "Contact";
  maxScore = 5;

  evaluate(resume: StructuredResume, _jd: StructuredJD, _rawText: string): EngineResult {
    let score = this.maxScore;
    const passed: string[] = [];
    const failed = [];
    const recs: string[] = [];
    
    if (resume.personalInfo?.email) {
      passed.push("Has Email");
    } else {
      score -= 2;
      failed.push({ ruleName: "Missing Email", reason: "No email address found", deduction: 2, confidence: "High", evidence: "No email extracted in personal info", expectedGain: 2, suggestedFix: "Add a professional email address." });
      recs.push("Add a professional email address.");
    }
    
    if (resume.personalInfo?.phone) {
      passed.push("Has Phone");
    } else {
      score -= 2;
      failed.push({ ruleName: "Missing Phone", reason: "No phone number found", deduction: 2, confidence: "High", evidence: "No phone extracted in personal info", expectedGain: 2, suggestedFix: "Add a contact phone number." });
      recs.push("Add a contact phone number.");
    }
    
    // Check LinkedIn
    const hasLinkedInUrl = resume.links?.some(l => l.url?.toLowerCase().includes("linkedin"));
    const hasLinkedInName = resume.links?.some(l => l.name?.toLowerCase().includes("linkedin"));
    const rawHasLinkedIn = _rawText.toLowerCase().includes("linkedin");
    
    if (hasLinkedInUrl) {
      passed.push("Has LinkedIn Profile URL");
    } else if (hasLinkedInName || rawHasLinkedIn) {
      // Partial credit for implicit link (parser limitation or missing URL)
      score -= 0.5;
      failed.push({ ruleName: "Implicit LinkedIn", reason: "LinkedIn mentioned but no URL extracted", deduction: 0.5, confidence: "Medium", evidence: "Found 'LinkedIn' text but no valid URL", expectedGain: 0.5, suggestedFix: "Ensure the LinkedIn text is a clickable hyperlink in the PDF." });
      recs.push("Make sure your LinkedIn text is an actual clickable hyperlink.");
    } else {
      score -= 1;
      failed.push({ ruleName: "Missing LinkedIn", reason: "No LinkedIn profile found", deduction: 1, confidence: "High", evidence: "No LinkedIn URL or text found", expectedGain: 1, suggestedFix: "Add a link to your LinkedIn profile." });
      recs.push("Add a link to your LinkedIn profile.");
    }
    
    return this.createResult(score, passed, failed, recs);
  }
}
