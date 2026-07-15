import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class ProjectsEngine extends BaseEngine {
  engineName = "Projects";
  maxScore = 5;

  evaluate(resume: StructuredResume, _jd: StructuredJD, _rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    if (!resume.projects || resume.projects.length === 0) {
      // It's not strictly required unless they lack experience
      if (!resume.experience || resume.experience.length === 0) {
        score -= 5;
        failed.push({ ruleName: "Missing Projects", reason: "No projects found to supplement lack of experience", deduction: 5, confidence: "High", evidence: "No projects section extracted", expectedGain: 5, suggestedFix: "Since you lack work experience, adding personal or academic projects is highly recommended." });
        recs.push("Since you lack work experience, adding personal or academic projects is highly recommended.");
      } else {
        // Just a minor deduction if experienced
        score -= 1;
        failed.push({ ruleName: "No Projects", reason: "No projects section found", deduction: 1, confidence: "Medium", evidence: "No projects section extracted", expectedGain: 1, suggestedFix: "Consider adding a projects section to showcase specific technical skills." });
        recs.push("Consider adding a projects section to showcase specific technical skills.");
      }
    } else {
      passed.push("Has Projects Section");
      
      let hasTech = false;
      resume.projects.forEach(p => {
        if (p.technologies && p.technologies.length > 0) {
          hasTech = true;
        }
      });
      
      if (!hasTech) {
        score -= 2;
        failed.push({ ruleName: "Missing Project Tech", reason: "Projects don't explicitly list technologies used", deduction: 2, confidence: "Medium", evidence: "No technologies array extracted for projects", expectedGain: 2, suggestedFix: "List the technologies used in each of your projects." });
        recs.push("List the technologies used in each of your projects.");
      } else {
        passed.push("Projects include tech stacks");
      }
    }

    return this.createResult(score, passed, failed, recs);
  }
}
