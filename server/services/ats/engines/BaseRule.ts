import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";

export abstract class BaseEngine {
  abstract engineName: string;
  abstract maxScore: number;

  abstract evaluate(resume: StructuredResume, jd: StructuredJD, rawText: string): EngineResult;

  protected createResult(score: number, passed: string[], failed: any[], recs: string[], metadata?: any): EngineResult {
    return {
      engineName: this.engineName,
      score: Math.max(0, score),
      maxScore: this.maxScore,
      passedRules: passed,
      failedRules: failed,
      recommendations: recs,
      metadata
    };
  }
}
