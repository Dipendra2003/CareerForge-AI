import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult, BulletAnalysis } from "./AuditTrace";
import { SkillDictionary } from "../registry/SkillDictionary";

const STRONG_VERBS = new Set([
  "engineered", "architected", "spearheaded", "optimized", "accelerated",
  "built", "designed", "developed", "implemented", "launched",
  "led", "managed", "orchestrated", "automated", "scaled",
  "reduced", "increased", "improved", "delivered", "created",
  "deployed", "integrated", "migrated", "refactored", "pioneered",
  "streamlined", "transformed", "established", "generated", "negotiated",
  "collaborated", "resolved", "secured", "mentored", "drove"
]);

const MODERATE_VERBS = new Set([
  "contributed", "supported", "utilized", "participated", "performed",
  "conducted", "maintained", "prepared", "coordinated", "analyzed",
  "researched", "documented", "updated", "configured", "tested",
  "reviewed", "monitored", "operated", "trained", "presented"
]);

const WEAK_VERBS = new Set([
  "helped", "assisted", "worked", "did", "was", "were", "made",
  "had", "got", "tried", "went", "used", "saw", "put"
]);

export class BulletAnalysisEngine extends BaseEngine {
  engineName = "Bullet Analysis";
  maxScore = 0; // Diagnostic engine — no score contribution, only metadata

  evaluate(resume: StructuredResume, jd: StructuredJD, rawText: string): EngineResult {
    const passed: string[] = [];
    const failed: any[] = [];
    const recs: string[] = [];
    const bulletAnalysis: BulletAnalysis[] = [];

    // Collect all JD keywords for relevance checking
    const jdKeywords = [
      ...(jd.requiredSkills || []),
      ...(jd.preferredSkills || []),
      ...(jd.keywords || [])
    ].map(k => k.toLowerCase());

    // Analyze experience bullets
    resume.experience?.forEach(exp => {
      const role = [exp.title, exp.company].filter(Boolean).join(" @ ");
      exp.achievements?.forEach(bullet => {
        bulletAnalysis.push(this.analyzeBullet(bullet, "Experience", role, jdKeywords));
      });
    });

    // Analyze project bullets
    resume.projects?.forEach(proj => {
      const role = proj.name || "Project";
      const descBullets = proj.description
        ? proj.description.split('\n').filter(l => l.trim().length > 10)
        : [];
      descBullets.forEach(bullet => {
        bulletAnalysis.push(this.analyzeBullet(bullet, "Projects", role, jdKeywords));
      });
    });

    // Compute summary stats
    const strongCount = bulletAnalysis.filter(b => b.grade === "Strong").length;
    const weakCount = bulletAnalysis.filter(b => b.grade === "Weak").length;
    const total = bulletAnalysis.length;

    if (total > 0) {
      if (strongCount / total >= 0.5) {
        passed.push(`${Math.round(strongCount / total * 100)}% of bullets rated Strong`);
      }
      if (weakCount > 0) {
        recs.push(`${weakCount} bullet(s) rated Weak — consider rewriting them with stronger action verbs and metrics.`);
      }
    }

    return this.createResult(0, passed, failed, recs, { bulletAnalysis });
  }

  private analyzeBullet(text: string, section: string, role: string, jdKeywords: string[]): BulletAnalysis {
    const trimmed = text.replace(/^[•\-\*\u2022\u25E6\u25AA\s]+/, '').trim();
    const words = trimmed.split(/\s+/);
    const lowerText = trimmed.toLowerCase();

    // 1. Action verb analysis
    const firstWord = words[0]?.toLowerCase().replace(/[^a-z]/g, '') || "";
    let verbStrength: "Strong" | "Moderate" | "Weak" = "Moderate";
    if (STRONG_VERBS.has(firstWord)) verbStrength = "Strong";
    else if (WEAK_VERBS.has(firstWord)) verbStrength = "Weak";
    else if (MODERATE_VERBS.has(firstWord)) verbStrength = "Moderate";
    else if (/^[a-z]/.test(firstWord)) verbStrength = "Weak"; // starts lowercase = weak

    // 2. Metrics detection
    const metricRegex = /(?:\b(?!(?:19|20)\d{2}\b)\d+(?:[,.]\d+)?(?:%|x|K|M|B|ms|s)?\b|\d+(?:[,.]\d+)?\+|\$[\d,]+(?:\.\d+)?[KkMmBb]?)/i;
    const metricMatch = trimmed.match(metricRegex);
    const hasMetrics = !!metricMatch;
    const metricSnippet = metricMatch ? metricMatch[0] : undefined;

    // 3. JD relevance — count how many JD keywords appear in this bullet
    const relevantKeywords: string[] = [];
    jdKeywords.forEach(kw => {
      const variations = SkillDictionary.getVariations(kw);
      if (variations.some(v => lowerText.includes(v))) {
        relevantKeywords.push(kw);
      }
    });
    const jdRelevance = jdKeywords.length > 0
      ? Math.min(100, Math.round((relevantKeywords.length / Math.min(jdKeywords.length, 5)) * 100))
      : 50; // Default 50 if no JD

    // 4. Length check
    let length: "Too Short" | "Good" | "Too Long" = "Good";
    if (words.length < 6) length = "Too Short";
    else if (words.length > 35) length = "Too Long";

    // 5. Compute issues
    const issues: string[] = [];
    if (verbStrength === "Weak") issues.push("Starts with a weak action verb");
    if (!hasMetrics) issues.push("No quantifiable metrics");
    if (length === "Too Short") issues.push("Bullet is too short — lacks detail");
    if (length === "Too Long") issues.push("Bullet is too long — reduce for readability");
    if (jdRelevance === 0 && jdKeywords.length > 0) issues.push("No JD keywords found in this bullet");
    if (/^[a-z]/.test(trimmed)) issues.push("Starts with lowercase letter");

    // 6. Compute overall score (0-100)
    let score = 50; // Baseline
    if (verbStrength === "Strong") score += 20;
    else if (verbStrength === "Weak") score -= 20;
    if (hasMetrics) score += 20;
    else score -= 10;
    if (jdRelevance >= 40) score += 15;
    else if (jdRelevance === 0 && jdKeywords.length > 0) score -= 10;
    if (length === "Good") score += 5;
    else score -= 5;
    if (/^[A-Z]/.test(trimmed)) score += 5;
    
    score = Math.min(100, Math.max(0, score));

    // 7. Grade
    let grade: "Strong" | "Needs Work" | "Weak" = "Needs Work";
    if (score >= 70) grade = "Strong";
    else if (score < 40) grade = "Weak";

    // 8. Suggested fix for weak bullets
    let suggestedFix: string | undefined;
    if (grade === "Weak") {
      const fixes: string[] = [];
      if (verbStrength === "Weak") fixes.push(`Replace "${words[0]}" with a strong verb like "Engineered", "Spearheaded", or "Optimized"`);
      if (!hasMetrics) fixes.push("Add a measurable outcome (e.g., 'by 30%', 'for 10K users')");
      if (length === "Too Short") fixes.push("Expand with specific details about your contribution");
      suggestedFix = fixes.join(". ");
    } else if (grade === "Needs Work") {
      if (!hasMetrics) suggestedFix = "Try adding a specific number or percentage to quantify your impact.";
    }

    return {
      text: trimmed,
      section,
      role,
      score,
      grade,
      actionVerb: { word: words[0] || "", strength: verbStrength },
      hasMetrics,
      metricSnippet,
      jdRelevance,
      relevantKeywords,
      length,
      issues,
      suggestedFix
    };
  }
}
