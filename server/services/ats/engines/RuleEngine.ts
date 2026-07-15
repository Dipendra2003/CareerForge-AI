import { StructuredResume, StructuredJD } from "../Types";
import { RuleRegistry } from "./RuleRegistry";
import { ScoreCalculator } from "./ScoreCalculator";
import { AuditTrace } from "./AuditTrace";

export class RuleEngine {
  static evaluateAll(resume: StructuredResume, jd: StructuredJD, rawText: string): AuditTrace {
    const engines = RuleRegistry.getEngines();
    
    const results = engines.map(engine => {
      try {
        return engine.evaluate(resume, jd, rawText);
      } catch (err) {
        console.error(`Error in engine ${engine.engineName}`, err);
        return {
          engineName: engine.engineName,
          score: 0,
          maxScore: engine.maxScore,
          passedRules: [],
          failedRules: [{ ruleName: "Engine Failure", reason: "Engine encountered an error", deduction: engine.maxScore }],
          recommendations: []
        };
      }
    });

    const trace = ScoreCalculator.calculate(results);

    // Set word count and recommended range based on experience
    const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;
    trace.resumeWordCount = wordCount;
    
    const totalYears = resume.experience?.length || 0;
    if (totalYears <= 2) {
      trace.recommendedWordRange = [300, 500];
    } else if (totalYears <= 5) {
      trace.recommendedWordRange = [400, 700];
    } else {
      trace.recommendedWordRange = [500, 900];
    }

    return trace;
  }
}
