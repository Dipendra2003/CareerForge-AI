import { BaseEngine } from "./BaseRule";
import { StructuredResume, StructuredJD } from "../Types";
import { EngineResult, KeywordFrequency } from "./AuditTrace";
import { SkillDictionary } from "../registry/SkillDictionary";

const SOFT_SKILLS = new Set([
  "communication", "leadership", "teamwork", "problem solving", "problem-solving",
  "critical thinking", "time management", "adaptability", "creativity",
  "collaboration", "interpersonal", "negotiation", "presentation",
  "conflict resolution", "decision making", "decision-making", "mentoring",
  "project management", "strategic planning", "emotional intelligence",
  "organization", "attention to detail", "analytical", "multitasking",
  "work ethic", "flexibility", "initiative", "self-motivated"
]);

export class KeywordEngine extends BaseEngine {
  engineName = "Keywords & JD Match";
  maxScore = 40; // Combines Skills (15), Keywords (15), and JD Match (10)

  evaluate(resume: StructuredResume, jd: StructuredJD, rawText: string): EngineResult {
    let score = this.maxScore;
    const passed = [];
    const failed = [];
    const recs = [];
    const keywordFrequency: KeywordFrequency[] = [];

    const lowerRaw = rawText.toLowerCase();
    
    // Build section-specific text blocks for context location tracking
    const skillsText = (resume.skills || []).join(' ').toLowerCase();
    const summaryText = (resume.summary || '').toLowerCase();
    let experienceText = "";
    resume.experience?.forEach(exp => {
      experienceText += (exp.description || "") + " ";
      exp.achievements?.forEach(a => experienceText += a + " ");
    });
    experienceText = experienceText.toLowerCase();
    let projectsText = "";
    resume.projects?.forEach(proj => {
      projectsText += (proj.description || "") + " ";
    });
    projectsText = projectsText.toLowerCase();

    // Helper: count occurrences of a keyword (all variations) in a text block
    const countOccurrences = (text: string, variations: string[]): number => {
      let count = 0;
      variations.forEach(v => {
        const regex = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = text.match(regex);
        if (matches) count += matches.length;
      });
      return count;
    };

    // Helper: find which sections contain the keyword
    const findLocations = (variations: string[]): KeywordFrequency["foundIn"] => {
      const locs: KeywordFrequency["foundIn"] = [];
      if (variations.some(v => skillsText.includes(v))) locs.push("Skills");
      if (variations.some(v => experienceText.includes(v))) locs.push("Experience");
      if (variations.some(v => summaryText.includes(v))) locs.push("Summary");
      if (variations.some(v => projectsText.includes(v))) locs.push("Projects");
      return locs;
    };

    // Helper: extract context snippets (the sentence containing the keyword)
    const findContextSnippets = (text: string, variations: string[]): string[] => {
      const snippets: string[] = [];
      // Split into rough sentences
      const sentences = text.split(/[.\n•\-\*\u2022]+/).map(s => s.trim()).filter(s => s.length > 10);
      variations.forEach(v => {
        sentences.forEach(sent => {
          if (sent.toLowerCase().includes(v) && snippets.length < 2) {
            // Truncate long sentences
            snippets.push(sent.length > 120 ? sent.substring(0, 117) + "..." : sent);
          }
        });
      });
      return snippets;
    };

    // Helper: count keyword occurrences in JD raw text
    const jdRawText = [
      jd.title || "",
      ...(jd.requiredSkills || []),
      ...(jd.preferredSkills || []),
      ...(jd.responsibilities || []),
      ...(jd.keywords || [])
    ].join(' ').toLowerCase();

    // 1. JD Required Skills (15 points)
    const required = jd.requiredSkills || [];
    let matchedRequired = 0;
    
    required.forEach(req => {
      const canonical = SkillDictionary.normalize(req).toLowerCase();
      const variations = SkillDictionary.getVariations(req);
      
      const inSkillsList = resume.skills?.some(s => SkillDictionary.normalize(s).toLowerCase() === canonical);
      const inContext = variations.some(v => experienceText.includes(v) || projectsText.includes(v));
      const inRawText = variations.some(v => lowerRaw.includes(v));

      const resumeCount = countOccurrences(lowerRaw, variations);
      const jdCount = countOccurrences(jdRawText, variations);
      const foundIn = findLocations(variations);
      const isSoftSkill = SOFT_SKILLS.has(req.toLowerCase());
      const contextSnippets = findContextSnippets(rawText, variations);
      
      if (inContext) {
        matchedRequired++;
        passed.push(`Found required skill: ${req}`);
        keywordFrequency.push({
          keyword: req, type: isSoftSkill ? "Soft Skill" : "Hard Skill",
          jdCount: Math.max(1, jdCount), resumeCount, foundIn,
          status: "matched", contextSnippets
        });
      } else if (inSkillsList || inRawText) {
        matchedRequired += 0.5;
        score -= 1;
        passed.push(`Found required skill: ${req}`);
        failed.push({ ruleName: "Skill Not In Context", reason: `Skill listed but not used in experience or projects: ${req}`, deduction: 1, confidence: "Medium", evidence: `Found ${req} in skills list but not in work or project achievements`, expectedGain: 1, suggestedFix: `To pass real ATS scanners, you must describe HOW you used ${req} in your work experience or project bullet points, rather than just listing it.` });
        recs.push(`Describe how you used ${req} in your experience or project bullets.`);
        keywordFrequency.push({
          keyword: req, type: isSoftSkill ? "Soft Skill" : "Hard Skill",
          jdCount: Math.max(1, jdCount), resumeCount, foundIn,
          status: "partial", contextSnippets
        });
      } else {
        score -= 2;
        failed.push({ ruleName: "Missing Required Skill", reason: `Missing required skill: ${req}`, deduction: 2, confidence: "Medium", evidence: `Could not find ${req} anywhere in resume`, expectedGain: 2, suggestedFix: `Add ${req} to your resume, preferably in your experience or projects section.` });
        recs.push(`Add ${req} to your resume, preferably in your experience or projects section.`);
        keywordFrequency.push({
          keyword: req, type: isSoftSkill ? "Soft Skill" : "Hard Skill",
          jdCount: Math.max(1, jdCount), resumeCount: 0, foundIn: [],
          status: "missing", contextSnippets: []
        });
      }
    });

    if (required.length > 0) {
      const coverage = matchedRequired / required.length;
      if (coverage === 1) passed.push("Matches 100% of required skills contextually");
      else passed.push(`Matches ${Math.round(coverage * 100)}% of required skills`);
    }

    if (score < 25) score = 25; 

    // 2. Keyword Density (15 points)
    const jdKeywords = jd.keywords || [];
    let matchedKeywords = 0;
    
    jdKeywords.forEach(kw => {
      const variations = SkillDictionary.getVariations(kw);
      const inText = variations.some(v => lowerRaw.includes(v));
      const resumeCount = countOccurrences(lowerRaw, variations);
      const jdCount = countOccurrences(jdRawText, variations);
      const foundIn = findLocations(variations);
      const contextSnippets = findContextSnippets(rawText, variations);

      if (inText) {
        matchedKeywords++;
        keywordFrequency.push({
          keyword: kw, type: "JD Keyword",
          jdCount: Math.max(1, jdCount), resumeCount, foundIn,
          status: "matched", contextSnippets
        });
      } else {
        score -= 1;
        failed.push({ ruleName: "Missing JD Keyword", reason: `Missing keyword: ${kw}`, deduction: 1, confidence: "Medium", evidence: `Could not find keyword ${kw} in raw text`, expectedGain: 1, suggestedFix: `Add keyword ${kw} to your resume.` });
        keywordFrequency.push({
          keyword: kw, type: "JD Keyword",
          jdCount: Math.max(1, jdCount), resumeCount: 0, foundIn: [],
          status: "missing", contextSnippets: []
        });
      }
    });

    if (jdKeywords.length > 0) {
      if (matchedKeywords >= jdKeywords.length * 0.8) {
        passed.push("Strong keyword density against JD");
      }
    }

    if (score < 10) score = 10;

    // 3. JD Match - Title & Industry (10 points)
    const targetTitle = jd.title?.toLowerCase() || "";
    let titleMatch = false;

    resume.experience?.forEach(exp => {
      if (exp.title && targetTitle.includes(exp.title.toLowerCase())) {
        titleMatch = true;
      }
    });

    if (targetTitle) {
      if (titleMatch || lowerRaw.includes(targetTitle)) {
        passed.push("Target job title found in resume");
      } else {
        score -= 3;
        failed.push({ ruleName: "Missing Target Title", reason: `Resume does not explicitly mention the target title: ${jd.title}`, deduction: 3, confidence: "High", evidence: `Could not find ${jd.title} anywhere in resume`, expectedGain: 3, suggestedFix: `Real ATS systems rank tailored resumes higher. Add the exact title "${jd.title}" under your name or in your summary.` });
        recs.push(`Real ATS systems rank tailored resumes higher. Add the exact title "${jd.title}" under your name or in your summary.`);
      }
    }

    if (required.length === 0 && jdKeywords.length === 0 && !targetTitle) {
      score -= 20;
      failed.push({ 
        ruleName: "No Target Job Profile", 
        reason: "Cannot accurately score keywords without a target job description or clear role.", 
        deduction: 20, 
        confidence: "High", 
        evidence: "No JD provided and failed to infer a target title", 
        expectedGain: 20, 
        suggestedFix: "Always paste the specific Job Description you are applying for when running an ATS scan. A generic resume without a target role scores poorly in real ATS systems." 
      });
      recs.push("Always paste the specific Job Description you are applying for when running an ATS scan.");
    }

    return this.createResult(score, passed, failed, recs, { keywordFrequency });
  }
}
