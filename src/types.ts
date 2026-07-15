export type PlanType = 'Free' | 'Pro' | 'Annual' | 'free' | 'pro' | 'annual' | string;

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: PlanType;
  scans_used: number; // For compatibility
  scans_used_this_month: number;
  extra_scans?: number; // Extra scans from admin quota override
  quota_reset_date?: string | null; // When the extra scans reset
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_end: string | null;
  created_at: string;
  googleId?: string | null;
  google_id?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
}

export interface Breakdown {
  keywords: number;
  format: number;
  experience: number;
  skills: number;
}

export type SuggestionType = 'critical' | 'improvement' | 'tip';

export interface Suggestion {
  type: SuggestionType;
  category?: string;
  text: string;
  priority?: number;
}

export interface RuleFailure {
  ruleName: string;
  reason: string;
  deduction: number;
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

export interface BulletAnalysis {
  text: string;
  section: string;
  role?: string;
  score: number;
  grade: "Strong" | "Needs Work" | "Weak";
  actionVerb: { word: string; strength: "Strong" | "Moderate" | "Weak" };
  hasMetrics: boolean;
  metricSnippet?: string;
  jdRelevance: number;
  relevantKeywords: string[];
  length: "Too Short" | "Good" | "Too Long";
  issues: string[];
  suggestedFix?: string;
}

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

export interface KeywordFrequency {
  keyword: string;
  type: "Hard Skill" | "Soft Skill" | "JD Keyword";
  jdCount: number;
  resumeCount: number;
  foundIn: string[];
  status: "matched" | "partial" | "missing";
  contextSnippets: string[];
}

export interface AuditTrace {
  overallScore: number;
  parsabilityScore: number;
  contentMatchScore: number;
  engines: EngineResult[];
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  matchedSkills?: string[];
  bulletAnalysis: BulletAnalysis[];
  checklistItems: ChecklistItem[];
  keywordFrequency: KeywordFrequency[];
  quantificationRate: { quantified: number; total: number; percentage: number };
  resumeWordCount: number;
  recommendedWordRange: [number, number];
}

export interface Scan {
  id: string;
  userId: string;
  atsScore: number;
  jobTitle: string | null;
  company: string | null;
  resumeText: string | null;
  jobDescription: string | null;
  matchedKeywords: string[] | MatchedKeyword[];
  missingKeywords: string[] | MissingKeyword[];
  breakdown: Breakdown | null;
  suggestions: Suggestion[];
  strengths?: string[] | Strength[];
  fullResult: any | null;
  auditTrace?: AuditTrace | null;
  resumeFileName?: string | null;
  resumeFilePublicId?: string | null;
  optimizedPdfUrl?: string | null;
  optimizedPdfPublicId?: string | null;
  optimizedPdfFileName?: string | null;
  optimizedPdfSize?: number | null;
  createdAt: string;
  detectedRole?: string;
  detectedIndustry?: string;
  structuredResume?: any;
  structuredJD?: any;
  resumeFileSize?: number;
  resumeFileUrl?: string | null;
  resumeMimeType?: string | null;
  resumeHash?: string | null;
  engineVersion?: string;
  parserVersion?: string;
  experienceAnalysis?: ExperienceAnalysis;
  formatIssues?: FormatIssue[];
  contactInfo?: ContactInfo;
  overallAssessment?: OverallAssessment;
  // Legacy snake_case for compatibility
  ats_score?: number;
  job_title?: string | null;
  matched_kw?: string[] | MatchedKeyword[];
  missing_kw?: string[] | MissingKeyword[];
  resume_text?: string | null;
  job_description?: string | null;
  created_at?: string;
}

export interface MatchedKeyword {
  keyword: string;
  category: string;
  context: string;
  synonymMatch?: boolean;
  original?: string;
}

export interface MissingKeyword {
  keyword: string;
  category: string;
  priority: string;
  suggestion?: string;
}

export interface ExperienceAnalysis {
  totalYears?: number;
  requiredYears?: number;
  meetsRequirement?: boolean;
  progression?: string;
  quantifiedAchievements: number;
  totalBullets: number;
  gaps?: string[];
}

export interface FormatIssue {
  type: string;
  severity: string;
  message: string;
  fix?: string;
}

export interface ContactInfo {
  hasEmail: boolean;
  hasPhone: boolean;
  hasLinkedIn?: boolean;
  hasLocation?: boolean;
  issues?: string[];
}

export interface OverallAssessment {
  readabilityScore?: number;
  atsCompatibility: number;
  competitivenessScore?: number;
  recommendation: string;
}

export interface Strength {
  category: string;
  text: string;
}

export interface CoverLetter {
  id: string;
  scanId: string;
  userId?: string;
  content: string;
  tone: string;
  createdAt: string;
  isFavorite?: boolean;
  name?: string;
}

export interface InterviewQuestion {
  question: string;
  type: 'Behavioral' | 'Technical' | 'Situational' | 'Role-Specific';
  sampleAnswer?: string;
  intent?: string;
  points?: string[];
}

export interface RedFlagQuestion {
  question: string;
  warning: string;
}

export interface InterviewPrep {
  id: string;
  scanId?: string;
  userId?: string;
  name?: string;
  questions: InterviewQuestion[];
  redFlags: RedFlagQuestion[];
  questionsToAsk: string[];
  isFavorite?: boolean;
  createdAt: string;
}

// API Contracts
export interface AnalyzeRequest {
  resumeText: string;
  jobDescription: string;
}

export interface AnalyzeResponse {
  atsScore: number;
  breakdown: Breakdown;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Suggestion[];
  strengths: string[];
  rewrittenBullets: string[];
  interviewQuestions: string[];
  linkedinOptimization: {
    headline: string;
    about: string;
  };
  coverLetterHints: string[];
  scoreExplanation?: string;
}

export interface RewriteBulletsRequest {
  bullets: string[];
  jobDescription: string;
}

export interface RewrittenBullet {
  original: string;
  improved: string;
  strengthScore: number;
  actionVerb: string;
  whyBetter: string;
  already_strong?: boolean;
}

export interface LinkedinOptimizationRequest {
  resumeText: string;
  targetRole: string;
}

export interface LinkedinOptimizationResponse {
  headline: string;
  about: string;
  skills: string[];
  featuredSectionIdeas: string[];
  recommendationRequestTemplates: string[];
}

export interface InterviewPrepRequest {
  resumeText: string;
  jobDescription: string;
}

export interface InterviewPrepResponse {
  questions: InterviewQuestion[];
  redFlagQuestions: RedFlagQuestion[];
  questionsToAsk: string[];
  preparationPlan: string;
}
