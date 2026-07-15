import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult } from "./AuditTrace";
import { DateParser } from "../utils/DateParser";

export class ExperienceEngine extends BaseEngine {
  engineName = "Experience";
  maxScore = 20;

  evaluate(resume: StructuredResume, jd: StructuredJD, _rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];

    if (!resume.experience || resume.experience.length === 0) {
      score = 0;
      failed.push({ ruleName: "Missing Experience", reason: "No work experience found", deduction: 20 });
      recs.push("Add professional experience to your resume.");
      return this.createResult(score, passed, failed, recs);
    }

    // 1. Calculate Exact Years of Experience using DateParser
    let missingDates = false;
    resume.experience.forEach(exp => {
      if (!exp.startDate) {
        missingDates = true;
      }
    });

    const totalYears = DateParser.calculateTotalYears(resume.experience);

    if (missingDates) {
      score -= 3;
      failed.push({ ruleName: "Missing Dates", reason: "Some roles are missing start or end dates", deduction: 3 });
      recs.push("Ensure all roles have clear start and end dates (Month Year).");
    } else {
      passed.push("Clear Employment Dates");
    }

    // Compare with JD requirements
    const requiredYears = jd.experience?.minimumYears || 0;
    if (requiredYears > 0) {
      if (totalYears >= requiredYears) {
        passed.push("Meets Experience Requirements");
      } else {
        score -= 5;
        // Floor it for display purposes to avoid "2.5 years" reading weirdly if not exact
        const displayYears = totalYears.toFixed(1);
        failed.push({ ruleName: "Experience Shortfall", reason: `Required ${requiredYears} years, found ${displayYears}`, deduction: 5 });
        recs.push(`This role requires ${requiredYears} years of experience, but you have ${displayYears}.`);
      }
    } else {
      passed.push("No specific years of experience required by JD");
    }

    // 2. Advanced Metrics Validation
    let hasMetrics = false;
    let bulletCount = 0;
    let quantifiedBullets = 0;
    let engineeringImpactCount = 0;

    const strongEngineeringVerbs = /rest api|authentication|architecture|performance optimization|database design|role based access control|payment integration|ai integration|deployment|scalability|caching|queue systems|docker|redis|cloud|ci\/cd|pipeline/i;

    const metricRegex = /(?:\b(?!(?:19|20)\d{2}\b)\d+(?:[,.]\d+)?(?:%|x|K|M|B|ms|s)?\b|\d+(?:[,.]\d+)?\+|\$[\d,]+(?:\.\d+)?[KkMmBb]?)/i;

    const checkMetrics = (bullets: string[]) => {
      bulletCount += bullets.length;
      bullets.forEach(b => {
        if (metricRegex.test(b)) {
          hasMetrics = true;
          quantifiedBullets++;
        }
        if (strongEngineeringVerbs.test(b)) {
          engineeringImpactCount++;
        }
      });
    };

    resume.experience.forEach(exp => checkMetrics(exp.achievements || []));
    
    if (resume.projects) {
      resume.projects.forEach(proj => {
         const descBullets = proj.description ? proj.description.split('\n').filter(l => l.trim().length > 0) : [];
         checkMetrics(descBullets);
      });
    }

    if (bulletCount === 0) {
      score -= 5;
      failed.push({ ruleName: "Missing Descriptions", reason: "Experience/Project entries lack bullet points", deduction: 5, confidence: "High", evidence: "No bullet points extracted", expectedGain: 5, suggestedFix: "Add 3-5 bullet points for each role explaining your impact." });
      recs.push("Add 3-5 bullet points for each role explaining your impact.");
    } else {
      // Require at least 25% of bullets to be quantified
      const metricRatio = quantifiedBullets / bulletCount;
      
      if (!hasMetrics && engineeringImpactCount === 0) {
        score -= 4;
        failed.push({ ruleName: "Missing Metrics", reason: "No quantifiable achievements or high-impact engineering work found", deduction: 4, confidence: "High", evidence: "No numbers or architecture keywords found in bullets", expectedGain: 4, suggestedFix: "Use numbers, percentages, or strong technical impact keywords to quantify your achievements." });
        recs.push("Use numbers, percentages, or dollar amounts to quantify your achievements.");
      } else if (!hasMetrics && engineeringImpactCount > 0) {
        score -= 1;
        failed.push({ ruleName: "Low Numeric Metrics", reason: "Strong engineering work detected, but lacks explicit numeric metrics (%, $)", deduction: 1, confidence: "High", evidence: `Found ${engineeringImpactCount} engineering impact keywords, but 0 numeric metrics`, expectedGain: 1, suggestedFix: "Try adding explicit numbers (e.g. 'reduced latency by 20%') to your technical bullets." });
        recs.push("Try adding explicit numbers (e.g. 'reduced latency by 20%') to your technical bullets.");
      } else if (metricRatio < 0.25 && engineeringImpactCount < 2) {
        score -= 2;
        failed.push({ ruleName: "Low Metrics", reason: "Fewer than 25% of bullets contain quantified metrics", deduction: 2, confidence: "Medium", evidence: `Only ${Math.round(metricRatio*100)}% of bullets quantified`, expectedGain: 2, suggestedFix: "Add more numbers to your bullet points. Aim for at least 30% of bullets to have metrics." });
        recs.push("Add more numbers to your bullet points to show measurable impact.");
      } else {
        passed.push("Strong Quantifiable / Engineering Achievements");
      }
    }

    return this.createResult(score, passed, failed, recs, {
      totalYears: parseFloat(totalYears.toFixed(1)),
      requiredYears: requiredYears,
      meetsRequirement: totalYears >= requiredYears,
      progression: "unknown",
      quantifiedAchievements: quantifiedBullets,
      totalBullets: bulletCount,
      gaps: []
    });
  }
}

