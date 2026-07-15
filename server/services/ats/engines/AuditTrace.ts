export interface RuleFailure {
  ruleName: string;
  reason: string;
  deduction: number;
  confidence?: "High" | "Medium" | "Low";
  evidence?: string;
  suggestedFix?: string;
  expectedGain?: number;
}

export interface EngineResult {
  engineName: string;
  score: number;
  maxScore: number;
  passedRules: string[];
  failedRules: RuleFailure[];
  recommendations: string[];
  metadata?: any;
}

// Per-bullet analysis (from BulletAnalysisEngine)
export interface BulletAnalysis {
  text: string;
  section: string;       // "Experience" | "Projects"
  role?: string;         // Company/project name context
  score: number;         // 0-100
  grade: "Strong" | "Needs Work" | "Weak";
  actionVerb: { word: string; strength: "Strong" | "Moderate" | "Weak" };
  hasMetrics: boolean;
  metricSnippet?: string; // e.g. "20%", "$5M"
  jdRelevance: number;   // 0-100 — how relevant to JD keywords
  relevantKeywords: string[];
  length: "Too Short" | "Good" | "Too Long";
  issues: string[];
  suggestedFix?: string;
}

// Unified checklist item generated from all engines
export interface ChecklistItem {
  id: string;
  category: "Parsability" | "Content" | "Keywords" | "Writing Quality" | "Structure";
  label: string;
  status: "pass" | "fail" | "warning";
  detail?: string;
  deduction: number;
  engineName: string;
  suggestedFix?: string;
}

// Keyword frequency data (from enhanced KeywordEngine)
export interface KeywordFrequency {
  keyword: string;
  type: "Hard Skill" | "Soft Skill" | "JD Keyword";
  jdCount: number;
  resumeCount: number;
  foundIn: ("Skills" | "Experience" | "Summary" | "Projects" | "Other")[];
  status: "matched" | "partial" | "missing";
  contextSnippets: string[];  // Exact sentences where found
}

export interface AuditTrace {
  overallScore: number;
  parsabilityScore: number;
  contentMatchScore: number;
  engines: EngineResult[];
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  matchedSkills: string[];
  bulletAnalysis: BulletAnalysis[];
  checklistItems: ChecklistItem[];
  keywordFrequency: KeywordFrequency[];
  quantificationRate: { quantified: number; total: number; percentage: number };
  resumeWordCount: number;
  recommendedWordRange: [number, number];
}
