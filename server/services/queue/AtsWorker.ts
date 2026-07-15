import { Worker, Job } from "bullmq";
import { connection } from "./connection";
import { SemanticExtractor } from "../ats/parser/SemanticExtractor";
import { RuleEngine } from "../ats/engines/RuleEngine";
import { AIManager } from "../ai/AIManager";
import prisma from "../../lib/prisma";
import * as Sentry from "@sentry/node";
import crypto from "crypto";

export const processAtsJob = async (job: { id: string, data: any, updateProgress: (p: number) => Promise<void> }) => {
    const { resumeText, jobDescription, userId, settings, planLimit, fileInfo } = job.data;
    
    await job.updateProgress(10);
    // Step 1: Semantic Extraction
    const structuredResume = await SemanticExtractor.extractResume(resumeText);
    const structuredJD = await SemanticExtractor.extractJD(jobDescription);
    
    await job.updateProgress(30);
    // Step 2: Rule Engine (Deterministic)
    const auditTrace = RuleEngine.evaluateAll(structuredResume, structuredJD, resumeText);
    
    await job.updateProgress(60);
    // Step 3: AI Suggestions & Caching
    const resumeHash = crypto.createHash('sha256').update(resumeText).digest('hex');
    
    // Check for AI caching based on identical resume & JD
    const cachedScan = await prisma.scan.findFirst({
      where: {
        resumeHash,
        jobDescription
      },
      orderBy: { createdAt: 'desc' }
    });

    let aiSuggestions: any = {};
    
    if (cachedScan && cachedScan.suggestions && cachedScan.suggestions.length > 0) {
       console.log(`Using cached AI suggestions for job ${job.id}`);
       aiSuggestions = cachedScan.suggestions[0];
    } else {
      const aiManager = await AIManager.getInstance();
      const systemInstruction = `You are an expert career coach and Principal ATS Architect. Based strictly on the deterministic ATS score and audit trace rule failures, provide qualitative improvements. DO NOT calculate scores or probabilities. ONLY return the requested JSON schema.`;
      const prompt = `
Resume: ${JSON.stringify(structuredResume)}
Job Description: ${JSON.stringify(structuredJD)}
Rule Failures: ${JSON.stringify(auditTrace.engines.flatMap(e => e.failedRules))}

Generate detailed rewrite suggestions for bullets, action verb enhancements, and section-by-section analysis.
`;

      const aiResponse = await aiManager.generateContent(prompt, {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            bulletRewrites: {
              type: "ARRAY",
              items: { 
                type: "OBJECT",
                properties: {
                  section: { type: "STRING" },
                  originalText: { type: "STRING" },
                  rewrittenText: { type: "STRING" },
                  reason: { type: "STRING" }
                }
              }
            },
            actionVerbEnhancements: {
              type: "ARRAY",
              items: { 
                type: "OBJECT",
                properties: {
                  weakVerb: { type: "STRING" },
                  strongVerb: { type: "STRING" },
                  context: { type: "STRING" }
                }
              }
            },
            sectionAnalysis: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  sectionName: { type: "STRING" },
                  feedback: { type: "STRING" },
                  priority: { type: "STRING" }
                }
              }
            }
          }
        }
      });

      const { parseGeminiJson } = await import("../aiUtils");
      aiSuggestions = JSON.parse(parseGeminiJson(aiResponse));
    }

    await job.updateProgress(90);
    // Step 4: Map & Save Results
    const formatEngine = auditTrace.engines.find(e => e.engineName === "Formatting") || { score: 0, failedRules: [] };
    const keywordEngine = auditTrace.engines.find(e => e.engineName === "Keywords & JD Match") || { score: 0 };
    const expEngine = auditTrace.engines.find(e => e.engineName === "Experience") || { score: 0 };
    const contactEngine = auditTrace.engines.find(e => e.engineName === "Contact") || { failedRules: [] };

    // Recruiter Perspective Thresholds: e.g. Contact = 5/5, Keywords > 35/40, Experience > 15/20 = 5 Stars
    let recruiterStars = 3;
    if (auditTrace.overallScore >= 85) recruiterStars = 5;
    else if (auditTrace.overallScore >= 70) recruiterStars = 4;
    else if (auditTrace.overallScore >= 50) recruiterStars = 3;
    else recruiterStars = 2;
    
    const hiringProbability = recruiterStars >= 4 ? "Likely Pass" : recruiterStars === 3 ? "Borderline" : "Needs Improvement";

    const validatedAnalysis = {
      atsScore: auditTrace.overallScore,
      jobTitle: structuredJD.title || "Unknown Title",
      detectedRole: structuredJD.seniority || undefined,
      detectedIndustry: structuredJD.industry || undefined,
      breakdown: { 
        keywords: Math.round((keywordEngine.score / 40) * 100) || 0,
        format: Math.round((formatEngine.score / 15) * 100) || 0,
        experience: Math.round((expEngine.score / 20) * 100) || 0
      },
      matchedKeywords: [],
      missingKeywords: auditTrace.missingSkills.map(kw => ({
        keyword: kw, category: "skill", priority: "high"
      })),
      experienceAnalysis: (expEngine as any).metadata || {
        totalYears: 0,
        requiredYears: structuredJD.experience?.minimumYears || 0,
        meetsRequirement: false,
        progression: "unknown",
        quantifiedAchievements: 0,
        totalBullets: 0,
        gaps: []
      },
      formatIssues: formatEngine.failedRules.map(f => ({
        type: f.ruleName, severity: "high", message: f.reason, fix: "Fix formatting."
      })),
      contactInfo: {
        hasEmail: !!structuredResume.personalInfo?.email,
        hasPhone: !!structuredResume.personalInfo?.phone,
        hasLinkedIn: !!structuredResume.links?.some(l => l.url?.includes("linkedin")),
        hasLocation: !!structuredResume.personalInfo?.location,
        issues: contactEngine.failedRules.map(f => f.reason)
      },
      suggestions: [aiSuggestions],
      aiSuggestions: aiSuggestions,
      strengths: [],
      overallAssessment: {
        readabilityScore: 100,
        atsCompatibility: Math.round((formatEngine.score / 15) * 100) || 0,
        competitivenessScore: auditTrace.overallScore,
        recommendation: recruiterStars >= 4 ? "strong_match" : "potential_match",
        matchPercentage: auditTrace.overallScore,
        hiringProbability: hiringProbability,
        recruiterStars: recruiterStars,
        criticalWeaknesses: []
      }
    };

    let savedScan = null;
    if (userId) {
      savedScan = await prisma.scan.create({
        data: {
          id: job.id, // Re-use BullMQ jobId as Prisma Scan ID!
          userId,
          jobTitle: validatedAnalysis.jobTitle !== "Unknown Title" ? validatedAnalysis.jobTitle : jobDescription.substring(0, 50).trim() || "Unknown Title",
          resumeText,
          jobDescription,
          atsScore: validatedAnalysis.atsScore,
          resumeFileUrl: fileInfo?.url,
          resumeFilePublicId: fileInfo?.public_id,
          resumeFileSize: fileInfo?.size,
          resumeMimeType: fileInfo?.mimetype,
          matchedKeywords: auditTrace.matchedSkills || [],
          missingKeywords: auditTrace.missingSkills || [],
          breakdown: validatedAnalysis.breakdown as any,
          suggestions: validatedAnalysis.suggestions as any,
          structuredResume: structuredResume as any,
          structuredJD: structuredJD as any,
          resumeHash: resumeHash,
          engineVersion: "4.0.0",
          parserVersion: "1.0.0",
          fullResult: {
            breakdown: validatedAnalysis.breakdown,
            matchedKeywords: auditTrace.matchedSkills || [],
            missingKeywords: validatedAnalysis.missingKeywords,
            suggestions: validatedAnalysis.suggestions,
            aiSuggestions: validatedAnalysis.aiSuggestions,
            detectedRole: validatedAnalysis.detectedRole,
            detectedIndustry: validatedAnalysis.detectedIndustry,
            experienceAnalysis: validatedAnalysis.experienceAnalysis,
            formatIssues: validatedAnalysis.formatIssues,
            contactInfo: validatedAnalysis.contactInfo,
            overallAssessment: validatedAnalysis.overallAssessment,
            auditTrace: auditTrace as any
          } as any
        }
      });
      
      // Auto-save to Resume Library if a file was uploaded
      if (fileInfo?.url) {
        await prisma.resume.create({
           data: {
             userId,
             name: fileInfo.filename || "Uploaded Resume",
             content: resumeText,
             fileUrl: fileInfo.url,
             filePublicId: fileInfo.public_id,
             fileSize: fileInfo.size,
             mimeType: fileInfo.mimetype,
             resumeHash: resumeHash
           }
        }).catch(err => console.error("Failed to auto-save resume:", err));
      }
    }

    await job.updateProgress(100);
    const resultScan = savedScan || {
      id: "guest-scan",
      created_at: new Date().toISOString(),
      job_title: validatedAnalysis.jobTitle,
      ats_score: validatedAnalysis.atsScore,
      breakdown: validatedAnalysis.breakdown as any,
      matched_kw: validatedAnalysis.matchedKeywords,
      missing_kw: validatedAnalysis.missingKeywords.map((k: any) => typeof k === 'string' ? k : k.keyword),
      suggestions: validatedAnalysis.suggestions,
      resume_text: resumeText,
      job_description: jobDescription,
      detectedRole: validatedAnalysis.detectedRole,
      detectedIndustry: validatedAnalysis.detectedIndustry,
      experienceAnalysis: validatedAnalysis.experienceAnalysis,
      formatIssues: validatedAnalysis.formatIssues,
      contactInfo: validatedAnalysis.contactInfo,
      overallAssessment: validatedAnalysis.overallAssessment,
      auditTrace: auditTrace,
      structuredResume: structuredResume,
      structuredJD: structuredJD,
      resumeHash: resumeHash,
      engineVersion: "4.0.0",
      parserVersion: "1.0.0",
      aiSuggestions: validatedAnalysis.aiSuggestions
    };

    return { 
      success: true, 
      scanId: savedScan?.id || job.id, 
      atsScore: validatedAnalysis.atsScore,
      scan: resultScan
    };
  };

export const atsWorker = new Worker(
  "ats-analysis-queue",
  processAtsJob as any,
  {
    connection: connection as any,
    concurrency: 5,
  }
);

atsWorker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

atsWorker.on('failed', async (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
  Sentry.captureException(err);
  
  // Rollback the quota increment that was done in analyze.ts
  // so the user isn't penalized for a system failure
  const userId = job?.data?.userId;
  if (userId) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { scansUsedThisMonth: { decrement: 1 } }
      });
      console.log(`Rolled back scan quota for user ${userId} after job failure`);
    } catch (rollbackErr) {
      console.error(`Failed to rollback quota for user ${userId}:`, rollbackErr);
      Sentry.captureException(rollbackErr);
    }
  }
});

atsWorker.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') return; 
  console.error('Worker error:', err.message);
});
