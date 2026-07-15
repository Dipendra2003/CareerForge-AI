import { Router } from "express";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { logger } from "../services/logger";
import { requireAuth, requireFeature } from "../middleware/auth";
import prisma from "../lib/prisma";
import { parseGeminiJson, containsInjection } from "../services/aiUtils";
import { AIManager } from "../services/ai/AIManager";
import { NotificationService } from "../services/notification/NotificationService";

const toolsRouter = Router();


// 1. Bullet Rewriter
toolsRouter.post("/rewrite-bullets", requireAuth, requireFeature("rewriter"), async (req: any, res) => {
  try {
    const { bullet, tone } = req.body;
    if (!bullet) return res.status(400).json({ error: "Bullet text required." });
    if (bullet.length > 5000) return res.status(400).json({ error: "Bullet text too long (max 5000 chars)." });
    if (containsInjection(bullet)) return res.status(400).json({ error: "Invalid input detected." });

    const aiSettings = await prisma.aISetting.findFirst();
    const aiManager = await AIManager.getInstance();

    let prompt = `Rewrite this resume bullet point to make it more impactful and ATS-friendly.
Tone: ${tone || "Professional"}
Original Bullet: ${bullet}`;

    if (aiSettings?.bulletRewriterPrompt) {
      prompt = aiSettings.bulletRewriterPrompt
        .replace("{{bullet}}", bullet)
        .replace("{{tone}}", tone || "Professional");
    }

    const responseText = await aiManager.generateContent(prompt, {
      systemInstruction: aiSettings?.systemPrompt || "You are an expert executive resume writer. Provide 3 optimized variations of the original bullet point.",
      temperature: aiSettings?.temperature ?? 0.7,
      topP: aiSettings?.topP ?? undefined,
      maxOutputTokens: aiSettings?.maxTokens || undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          suggestions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                original: { type: "STRING" },
                improved: { type: "STRING" },
                actionVerb: { type: "STRING" },
                strengthScore: { type: "INTEGER" },
                whyBetter: { type: "STRING" },
                already_strong: { type: "BOOLEAN" }
              },
              required: ["original", "improved", "actionVerb", "strengthScore", "whyBetter", "already_strong"]
            }
          }
        },
        required: ["suggestions"]
      }
    });

    const parsed = JSON.parse(parseGeminiJson(responseText));
    
    await prisma.aIOutput.create({
      data: {
        userId: req.user.id,
        type: "bullet_rewriter",
        prompt: prompt.substring(0, 500),
        content: JSON.stringify(parsed.suggestions)
      }
    });

    res.json({ suggestions: parsed.suggestions });
  } catch (err) {
    logger.error("Tools suggestion error", err);
    Sentry.captureException(err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// 2. Cover Letter Generator
toolsRouter.post("/cover-letter", requireAuth, requireFeature("cover letter"), async (req: any, res) => {
  try {
    const { resumeText, jobTitle, tone, scanId } = req.body;
    if (!resumeText || !jobTitle) return res.status(400).json({ error: "resumeText and jobTitle required." });
    if (resumeText.length > 20000) return res.status(400).json({ error: "Resume text too long (max 20000 chars)." });
    if (jobTitle.length > 500) return res.status(400).json({ error: "Job title too long (max 500 chars)." });
    if (containsInjection(resumeText) || containsInjection(jobTitle)) return res.status(400).json({ error: "Invalid input detected." });

    let dbJobDescription = "";
    let validScanId = null;
    
    if (scanId && scanId !== "manual-tool") {
      const dbScan = await prisma.scan.findFirst({
        where: { id: scanId, userId: req.user.id },
        select: { id: true, jobDescription: true }
      });
      if (dbScan) {
        validScanId = dbScan.id;
        dbJobDescription = dbScan.jobDescription || "";
      }
    }
    
    // If no valid scan, create a default relational scan for cover letter
    if (!validScanId) {
      const newScan = await prisma.scan.create({
        data: {
          userId: req.user.id,
          jobTitle: jobTitle,
          jobDescription: dbJobDescription || "Generated from AI Tools",
          resumeText: resumeText.substring(0, 10000)
        }
      });
      validScanId = newScan.id;
    }

    const aiSettings = await prisma.aISetting.findFirst();
    const aiManager = await AIManager.getInstance();

    let prompt = `Generate a highly professional, 200-280 word cover letter.
Resume: ${resumeText.substring(0, 5000)}
Target Job Title: ${jobTitle}
${dbJobDescription ? "Job Description: " + dbJobDescription.substring(0, 5000) : ""}
Tone: ${tone || "Professional"}`;

    if (aiSettings?.coverLetterPrompt) {
      prompt = aiSettings.coverLetterPrompt
        .replace("{{resumeText}}", resumeText.substring(0, 5000))
        .replace("{{jobTitle}}", jobTitle)
        .replace("{{jobDescription}}", dbJobDescription ? dbJobDescription.substring(0, 5000) : "")
        .replace("{{tone}}", tone || "Professional");
    }

    const response = await aiManager.generateContent(prompt, {
        systemInstruction: aiSettings?.systemPrompt || "You are an expert career coach writing a cover letter.",
        temperature: aiSettings?.temperature ?? 0.7,
        topP: aiSettings?.topP ?? undefined,
        maxOutputTokens: aiSettings?.maxTokens || undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            coverLetter: {
              type: "OBJECT",
              properties: {
                content: { type: "STRING", description: "The body of the cover letter" }
              },
              required: ["content"]
            }
          },
          required: ["coverLetter"]
        }
      });

    const parsed = JSON.parse(parseGeminiJson(response));
    
    // Validate output
    const ClSchema = z.object({
        coverLetter: z.object({
            content: z.string()
        })
    });
    const validated = ClSchema.parse(parsed);

    // Always save cover letter to database with valid scanId
    const coverLetter = await prisma.coverLetter.create({
      data: {
        scanId: validScanId,
        userId: req.user.id,
        content: validated.coverLetter.content,
        tone: tone || "Professional"
      }
    });

    try {
      const { logActivity } = await import("../utils/auditLogger");
      await logActivity({ req, action: 'Cover Letter Generated', module: 'AI Tools', description: `Generated cover letter for ${jobTitle}` });
      await NotificationService.sendAI(
        req.user.id,
        "Cover Letter Ready",
        `Your cover letter for ${jobTitle} has been generated.`
      );
    } catch(e) {}

    res.json({ coverLetter: validated.coverLetter });
  } catch (err) {
    logger.error("Tools Cover Letter error", err);
    Sentry.captureException(err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// 3. LinkedIn Optimizer
toolsRouter.post("/linkedin", requireAuth, requireFeature("linkedin"), async (req: any, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ error: "resumeText required." });
    if (containsInjection(resumeText)) return res.status(400).json({ error: "Invalid input detected." });

    const aiSettings = await prisma.aISetting.findFirst();
    const aiManager = await AIManager.getInstance();

    let prompt = `Optimize my LinkedIn profile based on my resume.
Resume:
${resumeText.substring(0, 10000)}`;

    if (aiSettings?.linkedinPrompt) {
      prompt = aiSettings.linkedinPrompt.replace("{{resumeText}}", resumeText.substring(0, 10000));
    }

    const response = await aiManager.generateContent(prompt, {
        systemInstruction: aiSettings?.systemPrompt || "You are a LinkedIn profile optimization expert.",
        temperature: aiSettings?.temperature ?? 0.7,
        topP: aiSettings?.topP ?? undefined,
        maxOutputTokens: aiSettings?.maxTokens || undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            headline: { type: "STRING" },
            about: { type: "STRING" },
            skills: { 
              type: "ARRAY", 
              items: { type: "STRING" },
              description: "Top 10 skills for linkedin"
            },
            featuredSectionIdeas: { 
              type: "ARRAY",
              items: { type: "STRING" }
            },
            recommendationTemplates: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  targetRole: { type: "STRING" },
                  message: { type: "STRING" }
                },
                required: ["targetRole", "message"]
              }
            }
          },
          required: ["headline", "about", "skills", "featuredSectionIdeas", "recommendationTemplates"]
        }
      });

    const parsed = JSON.parse(parseGeminiJson(response));
    
    const LiSchema = z.object({
      headline: z.string(),
      about: z.string(),
      skills: z.array(z.string()).max(15),
      featuredSectionIdeas: z.array(z.string()),
      recommendationTemplates: z.array(z.object({
        targetRole: z.string(),
        message: z.string()
      }))
    });

    const validated = LiSchema.parse(parsed);
    
    // Save LinkedIn    // Always save AI output to database
    await prisma.aIOutput.create({
      data: {
        userId: req.user.id,
        type: "linkedin_optimization",
        prompt: "LinkedIn Profile Generation",
        content: JSON.stringify(validated)
      }
    });

    try {
      const { logActivity } = await import("../utils/auditLogger");
      await logActivity({ req, action: 'LinkedIn Profile Generated', module: 'AI Tools', description: `Generated LinkedIn profile optimization` });
      await NotificationService.sendAI(
        req.user.id,
        "LinkedIn Profile Ready",
        `Your LinkedIn profile optimization is complete.`
      );
    } catch(e) {}

    res.json({ optimized: validated });
  } catch (err) {
    logger.error("Tools Linkedin error", err);
    Sentry.captureException(err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// 4. Interview Prep
toolsRouter.post("/interview-prep", requireAuth, requireFeature("interview"), async (req: any, res) => {
  try {
    const { resumeText, jobDescription, scanId } = req.body;
    if (!resumeText || !jobDescription) return res.status(400).json({ error: "resumeText and jobDescription required." });
    if (containsInjection(resumeText) || containsInjection(jobDescription)) return res.status(400).json({ error: "Invalid input detected." });

    let validScanId = null;
    
    if (scanId && scanId !== "manual-tool") {
      const dbScan = await prisma.scan.findFirst({
        where: { id: scanId, userId: req.user.id },
        select: { id: true }
      });
      if (dbScan) {
        validScanId = dbScan.id;
      }
    }
    
    // If no valid scan, create a default relational scan for interview prep
    if (!validScanId) {
      const newScan = await prisma.scan.create({
        data: {
          userId: req.user.id,
          jobTitle: "Interview Prep",
          jobDescription: jobDescription.substring(0, 10000),
          resumeText: resumeText.substring(0, 10000)
        }
      });
      validScanId = newScan.id;
    }

    const aiSettings = await prisma.aISetting.findFirst();
    const aiManager = await AIManager.getInstance();

    let prompt = `Generate interview preparation material.
Job Description: ${jobDescription.substring(0, 10000)}
Resume: ${resumeText.substring(0, 10000)}`;

    if (aiSettings?.interviewPrompt) {
      prompt = aiSettings.interviewPrompt
        .replace("{{jobDescription}}", jobDescription.substring(0, 10000))
        .replace("{{resumeText}}", resumeText.substring(0, 10000));
    }

    const response = await aiManager.generateContent(prompt, {
        systemInstruction: aiSettings?.systemPrompt || "You are an executive interview coach. Return exact JSON.",
        temperature: aiSettings?.temperature ?? 0.7,
        topP: aiSettings?.topP ?? undefined,
        maxOutputTokens: aiSettings?.maxTokens || undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            questions: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING", description: "The interview question" },
                  type: { type: "STRING", description: "Type of question (e.g. Behavioral, Technical, Cultural)" },
                  intent: { type: "STRING", description: "Interviewer intent" },
                  sampleAnswer: { type: "STRING", description: "A STAR method answer frame" },
                  points: { type: "ARRAY", items: { type: "STRING" }, description: "Key talking points" }
                },
                required: ["question", "type", "intent", "sampleAnswer", "points"]
              },
              description: "Exactly 12 interview questions"
            },
            redFlags: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  question: { type: "STRING" },
                  warning: { type: "STRING" }
                },
                required: ["question", "warning"]
              },
              description: "Exactly 2 warnings/red flags the interviewer might probe about"
            },
            questionsToAsk: {
              type: "ARRAY",
              items: { type: "STRING" },
              description: "Exactly 5 questions to ask the employer"
            },
            preparationPlan: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  day: { type: "INTEGER" },
                  focus: { type: "STRING" },
                  tasks: { type: "ARRAY", items: { type: "STRING" } }
                },
                required: ["day", "focus", "tasks"]
              },
              description: "3-day prep plan"
            }
          },
          required: ["questions", "redFlags", "questionsToAsk", "preparationPlan"]
        }
      });

    const parsed = JSON.parse(parseGeminiJson(response));
    
    // Ensure the tools output is validated via Zod 
    const IpSchema = z.object({
      questions: z.array(z.object({
        question: z.string(),
        type: z.string(),
        intent: z.string(),
        sampleAnswer: z.string(),
        points: z.array(z.string())
      })),
      redFlags: z.array(z.object({
        question: z.string(),
        warning: z.string()
      })),
      questionsToAsk: z.array(z.string()),
      preparationPlan: z.array(z.object({
        day: z.number(),
        focus: z.string(),
        tasks: z.array(z.string())
      }))
    });

    const validated = IpSchema.parse(parsed);

    // Always save interview prep to database with valid scanId
    await prisma.interviewPrep.create({
      data: {
        scanId: validScanId,
        userId: req.user.id,
        name: `Interview Prep - ${jobDescription.substring(0, 50)}...`,
        questions: validated.questions as any,
        redFlags: validated.redFlags as any,
        questionsToAsk: validated.questionsToAsk as any
      }
    });

    try {
      const { logActivity } = await import("../utils/auditLogger");
      await logActivity({ req, action: 'Interview Prep Generated', module: 'AI Tools', description: `Generated interview prep questions` });
      await NotificationService.sendAI(
        req.user.id,
        "Interview Prep Ready",
        `Your custom interview preparation guide is ready.`
      );
    } catch(e) {}

    res.json({
        questions: validated.questions,
        redFlags: validated.redFlags,
        questionsToAsk: validated.questionsToAsk,
        preparationPlan: validated.preparationPlan
    });
  } catch (err) {
    logger.error("Tools interview prep error", err);
    Sentry.captureException(err);
    res.status(500).json({ error: "AI processing failed." });
  }
});
// 5. Resume Section Rewrite
toolsRouter.post("/resume-rewrite", requireAuth, requireFeature("rewriter"), async (req: any, res) => {
  try {
    const { sectionType, originalText, jobDescription, scanId } = req.body;
    if (!sectionType || !originalText) return res.status(400).json({ error: "sectionType and originalText required." });
    if (originalText.length > 10000) return res.status(400).json({ error: "Text too long (max 10000 chars)." });
    if (containsInjection(originalText)) return res.status(400).json({ error: "Invalid input detected." });

    const aiManager = await AIManager.getInstance();
    const prompt = `Rewrite the ${sectionType} section of a resume to improve ATS match.
Original Text: ${originalText}
Job Description Context: ${jobDescription?.substring(0, 5000) || "None provided"}

Rules: Preserve all facts, do not invent experience, optimize action verbs and keywords, improve impact metrics if implied.`;

    const response = await aiManager.generateContent(prompt, {
      systemInstruction: "You are an expert executive resume writer. Only return the exact JSON structure.",
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          improvedText: { type: "STRING" },
          changesMade: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["improvedText", "changesMade"]
      }
    });

    res.json(JSON.parse(parseGeminiJson(response)));
  } catch (err) {
    logger.error("Tools resume rewrite error", err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// 6. Skill Roadmap
toolsRouter.post("/skill-roadmap", requireAuth, async (req: any, res) => {
  try {
    const { missingSkills, jobTitle } = req.body;
    if (!missingSkills || !Array.isArray(missingSkills)) return res.status(400).json({ error: "missingSkills array required." });

    const aiManager = await AIManager.getInstance();
    const prompt = `Generate a learning roadmap for ${jobTitle}. Missing Skills: ${missingSkills.slice(0, 20).join(', ')}`;

    const response = await aiManager.generateContent(prompt, {
      systemInstruction: "You are a career development expert. Output only JSON.",
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          roadmap: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                skill: { type: "STRING" },
                priority: { type: "STRING" },
                difficulty: { type: "STRING" },
                estimatedTime: { type: "STRING" },
                recommendedResources: { type: "ARRAY", items: { type: "STRING" } }
              },
              required: ["skill", "priority", "difficulty", "estimatedTime", "recommendedResources"]
            }
          }
        },
        required: ["roadmap"]
      }
    });

    res.json(JSON.parse(parseGeminiJson(response)));
  } catch (err) {
    logger.error("Tools skill roadmap error", err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// 7. AI Chat
toolsRouter.post("/ai-chat", requireAuth, async (req: any, res) => {
  try {
    const { message, scanId, history } = req.body;
    if (!message || !scanId) return res.status(400).json({ error: "message and scanId required." });
    
    const dbScan = await prisma.scan.findFirst({
      where: { id: scanId, userId: req.user.id },
      select: { fullResult: true, jobTitle: true, atsScore: true }
    });
    
    if (!dbScan) return res.status(404).json({ error: "Scan not found." });

    const aiManager = await AIManager.getInstance();
    const fullResult = dbScan.fullResult as any;
    
    // Boundary Enforcement: The AI must only answer using structured facts, never rewriting score
    const prompt = `User Message: ${message}
Conversation History: ${JSON.stringify(history?.slice(-5) || [])}
Resume Facts: ${JSON.stringify(fullResult?.experienceAnalysis || {})}
ATS Score: ${dbScan.atsScore}
Audit Trace Failures: ${JSON.stringify(fullResult?.auditTrace?.engines?.flatMap((e: any) => e.failedRules) || [])}`;

    const response = await aiManager.generateContent(prompt, {
      systemInstruction: "You are CareerForge AI. Answer questions about the user's resume and job match based ONLY on the provided structured facts and Audit Trace rule failures. DO NOT change the ATS score. Be helpful and professional. Return exact JSON.",
      temperature: 0.7,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          reply: { type: "STRING" },
          suggestedActions: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["reply"]
      }
    });

    res.json(JSON.parse(parseGeminiJson(response)));
  } catch (err) {
    logger.error("Tools AI Chat error", err);
    res.status(500).json({ error: "AI processing failed." });
  }
});

export default toolsRouter;
