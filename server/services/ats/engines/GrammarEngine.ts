import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export class GrammarEngine extends BaseEngine {
  engineName = "Grammar";
  maxScore = 3;

  evaluate(resume: StructuredResume, _jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    // Filter out standard PDF leader dots (e.g., used for alignment)
    const cleanedText = rawText.replace(/\.{3,}/g, " ");

    if (/\,{3,}/.test(cleanedText) || /\;{2,}/.test(cleanedText)) {
      score -= 1;
      failed.push({ ruleName: "Punctuation Errors", reason: "Detected consecutive punctuation marks", deduction: 1, confidence: "Low", evidence: "Found consecutive commas or semicolons", expectedGain: 1, suggestedFix: "Review resume for punctuation typos." });
      recs.push("Review resume for punctuation typos.");
    }
    
    // Check if bullet points start with lowercase or weak verbs
    let lowercaseBullets = 0;
    let weakVerbs = 0;
    const weakVerbList = ["helped", "assisted", "worked", "did", "was", "were", "made", "responsible for"];

    if (resume.experience) {
      resume.experience.forEach(exp => {
        exp.achievements?.forEach(ach => {
          const trimmed = ach.replace(/^[^a-zA-Z]+/, '').trim(); 
          if (trimmed.match(/^[a-z]/)) lowercaseBullets++;

          const firstWord = trimmed.split(' ')[0]?.toLowerCase();
          const firstTwoWords = trimmed.split(' ').slice(0, 2).join(' ').toLowerCase();

          if (weakVerbList.includes(firstWord) || weakVerbList.includes(firstTwoWords)) {
            weakVerbs++;
          }
        });
      });
    }

    if (lowercaseBullets > 0) {
      score -= 1;
      failed.push({ ruleName: "Capitalization", reason: `Found ${lowercaseBullets} bullet points starting with lowercase letters`, deduction: 1, confidence: "Medium", evidence: `Found ${lowercaseBullets} lowercase bullets`, expectedGain: 1, suggestedFix: "Ensure all bullet points start with a capital letter." });
      recs.push("Ensure all bullet points start with a capital letter.");
    } else {
      passed.push("Good Capitalization");
    }

    if (weakVerbs > 0) {
      score -= 1;
      failed.push({ ruleName: "Weak Action Verbs", reason: `Found ${weakVerbs} bullet points starting with weak verbs (e.g. helped, worked, responsible for)`, deduction: 1, confidence: "Medium", evidence: `Found ${weakVerbs} weak verbs`, expectedGain: 1, suggestedFix: "Start your bullet points with strong action verbs (e.g. Engineered, Spearheaded, Designed)." });
      recs.push("Start your bullet points with strong action verbs (e.g. Engineered, Spearheaded, Designed).");
    } else {
      passed.push("Strong Action Verbs");
    }

    if (score === this.maxScore) {
      passed.push("No major grammatical errors detected");
    }

    return this.createResult(score, passed, failed, recs);
  }
}

