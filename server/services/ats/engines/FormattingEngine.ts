import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class FormattingEngine extends BaseEngine {
  engineName = "Formatting";
  maxScore = 10;

  evaluate(resume: StructuredResume, _jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    const lowerText = rawText.toLowerCase();

    // Tables check
    // Restrict strictly to markdown tables or HTML tables to prevent false positives
    const hasMarkdownTable = /\|[\s-]*\|/.test(rawText) && rawText.split('\n').filter(line => line.includes('|')).length > 2;
    const hasHtmlTable = /<table|colspan|rowspan/i.test(rawText);
    
    if (hasMarkdownTable || hasHtmlTable || lowerText.includes("table layout")) {
      score -= 3;
      failed.push({ ruleName: "Avoid Tables", reason: "Detected potential table structure", deduction: 3, confidence: "High", evidence: "Found table formatting markers", expectedGain: 3, suggestedFix: "Remove tables or columns. Use standard single-column formatting." });
      recs.push("Remove tables or columns. Use standard single-column formatting.");
    } else {
      passed.push("No Tables Detected");
    }

    // Images/Icons check
    const hasIcons = /(?![\u2022\u25E6\u25AA\u25AB\u2013\u2014\u2713\u2714\u2705\u27A4\u27A2\u27A3>~*-])([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF])/.test(rawText.replace(/[\u2022\u25E6\u25AA\u25AB\u2013\u2014\u2713\u2714\u2705\u27A4\u27A2\u27A3>*-]/g, ''));
    if (hasIcons) {
      score -= 2;
      failed.push({ ruleName: "Avoid Icons", reason: "Detected non-standard icons or emojis", deduction: 2, confidence: "Medium", evidence: "Found complex Unicode characters", expectedGain: 2, suggestedFix: "Remove icons and emojis as ATS systems cannot parse them. Stick to standard bullet points." });
      recs.push("Remove icons and emojis as ATS systems cannot parse them. Stick to standard bullet points.");
    } else {
      passed.push("No Icons Detected");
    }

    // Standard sections
    const hasExp = Boolean(resume.experience && resume.experience.length > 0);
    const hasEdu = Boolean(resume.education && resume.education.length > 0);
    const hasSkills = Boolean(resume.skills && resume.skills.length > 0);

    let sectionScore = 10;
    if (!hasExp) {
      sectionScore -= 4;
      failed.push({ ruleName: "Experience Section", reason: "Missing recognizable experience section", deduction: 4 });
      recs.push("Add a clear 'Experience' section.");
    }
    if (!hasEdu) {
      sectionScore -= 3;
      failed.push({ ruleName: "Education Section", reason: "Missing recognizable education section", deduction: 3 });
      recs.push("Add a clear 'Education' section.");
    }
    if (!hasSkills) {
      sectionScore -= 3;
      failed.push({ ruleName: "Skills Section", reason: "Missing recognizable skills section", deduction: 3 });
      recs.push("Add a clear 'Skills' section.");
    }

    if (hasExp && hasEdu && hasSkills) {
      passed.push("Standard Sections Found");
    }

    score = score - (10 - sectionScore);

    return this.createResult(score, passed, failed, recs);
  }
}

