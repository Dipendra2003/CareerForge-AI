import { Router } from "express";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { logger } from "../services/logger";
import { optionalAuth } from "../middleware/auth";
import prisma from "../lib/prisma";
import { parseGeminiJson } from "../services/aiUtils";
import { AIManager } from "../services/ai/AIManager";
import { NotificationService } from "../services/notification/NotificationService";
import { SemanticExtractor } from "../services/ats/parser/SemanticExtractor";
import { RuleEngine } from "../services/ats/engines/RuleEngine";
import { connection } from "../services/queue/connection";

const analyzeRouter = Router();

analyzeRouter.post("/", optionalAuth, async (req: any, res) => {
  const user = req.user;
  let quotaIncremented = false;
  let jobDispatched = false;
  
  try {
    const { resumeText, jobDescription, resumeFileName, fileInfo } = req.body;

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ error: "Resume and Job Description are required." });
    }

    let scansUsed = 0;
    let plan = "free";
    let planLimit = 0;

    const settings = await prisma.systemSetting.findFirst();
    const fallbackSettings = { guestScanLimit: 1, freeScanLimit: 3, proScanLimit: 999999, annualScanLimit: 999999, maxResumeCharacters: 20000, maxJDCharacters: 10000, allowGuestScans: true };
    const currentSettings = settings || fallbackSettings;

    if (resumeText.length > (currentSettings.maxResumeCharacters || 20000)) {
      return res.status(400).json({ error: `Resume length exceeds ${currentSettings.maxResumeCharacters} characters.` });
    }

    if (jobDescription.length > (currentSettings.maxJDCharacters || 10000)) {
      return res.status(400).json({ error: `Job description length exceeds ${currentSettings.maxJDCharacters} characters.` });
    }

    // Rate Limit enforcement
    if (user) {
      // Read directly from user record
      const data: any = await prisma.user.findUnique({
        where: { id: user.id },
        select: { plan: true, userQuotaOverride: true, scansUsedThisMonth: true }
      });
        
      let extraScans = 0;
      if (data) {
        plan = String(data.plan || "free").toLowerCase();
        scansUsed = data.scansUsedThisMonth || 0;
        
        if ((data as any).userQuotaOverride) {
            if (!(data as any).userQuotaOverride.resetDate || new Date((data as any).userQuotaOverride.resetDate) > new Date()) {
                extraScans = (data as any).userQuotaOverride.extraScans || 0;
            }
        }
      }
      
      let userPlanLimit = currentSettings.freeScanLimit;
      if (plan && plan !== "free") {
        userPlanLimit = currentSettings.proScanLimit ?? 999999;
      }
      
      userPlanLimit += extraScans;

      if (scansUsed >= userPlanLimit) {
        return res.status(402).json({ 
          quotaError: true, 
          message: `Quota Exceeded: You have reached your ${userPlanLimit} scans limit.` 
        });
      }
      
      // Prevent race conditions by incrementing quota at the time of enqueueing
      await prisma.user.update({
        where: { id: user.id },
        data: { scansUsedThisMonth: { increment: 1 } }
      });
      quotaIncremented = true;
      
      planLimit = userPlanLimit;
    } else {
      if (!currentSettings.allowGuestScans) {
        return res.status(403).json({ error: "Guest scans are currently disabled. Please sign up." });
      }
      const ip = req.ip || req.connection.remoteAddress || "unknown";
      const redisKey = `guest_scan_limit:${ip}`;
      const usageStr = await connection.get(redisKey);
      const usage = parseInt(usageStr || "0");
      
      if (usage >= (currentSettings.guestScanLimit || 1)) {
        return res.status(402).json({ 
          quotaError: true, 
          message: `Guest Limit Exceeded: You have used your ${currentSettings.guestScanLimit} free analysis. Please sign up to continue.` 
        });
      }
      
      await connection.incr(redisKey);
      quotaIncremented = true;
      if (usage === 0) {
        await connection.expire(redisKey, 86400); // 24 hours
      }
      
      planLimit = currentSettings.guestScanLimit || 1;
    }

    // Call ATS v3 Phase 5: Enqueue Job
    const crypto = await import("crypto");
    const jobId = crypto.randomUUID();
    const { addAtsJob } = await import("../services/queue/AtsQueue");
    
    const jobData = {
      resumeText,
      jobDescription,
      userId: user?.id,
      settings: currentSettings,
      planLimit,
      fileInfo
    };

    try {
      await addAtsJob(jobId, jobData);
      jobDispatched = true;
    } catch (e: any) {
      if (e.message && e.message.includes("Connection is closed")) {
        logger.warn("Redis is offline. Falling back to local in-memory processing for job " + jobId);
        
        // Setup mock job status
        (global as any).fallbackJobs = (global as any).fallbackJobs || new Map();
        (global as any).fallbackJobs.set(jobId, { state: "active", progress: 0 });
        
        // Process synchronously in background
        jobDispatched = true;
        import("../services/queue/AtsWorker").then(({ processAtsJob }) => {
           processAtsJob({
             id: jobId,
             data: jobData,
             updateProgress: async (p) => { 
                (global as any).fallbackJobs.set(jobId, { state: "active", progress: p }); 
             }
           }).then(result => {
             (global as any).fallbackJobs.set(jobId, { state: "completed", progress: 100, returnvalue: result });
           }).catch(async err => {
             logger.error("Local processing failed", err);
             (global as any).fallbackJobs.set(jobId, { state: "failed", error: err.message });
             
             // Rollback quota for async fallback failure
             if (user?.id) {
               await prisma.user.update({
                 where: { id: user.id },
                 data: { scansUsedThisMonth: { decrement: 1 } }
               }).catch(e => logger.error("Failed to rollback quota", e));
             } else {
               const ip = req.ip || req.connection?.remoteAddress || "unknown";
               await connection.decr(`guest_scan_limit:${ip}`).catch(e => logger.error("Failed to rollback guest limit", e));
             }
           });
        });
      } else {
        throw e;
      }
    }

    res.status(202).json({
      message: "Analysis Queued",
      jobId,
      statusUrl: `/api/analyze/status/${jobId}`
    });

  } catch (err: any) {
    logger.error("Analysis Error", err);
    Sentry.captureException(err);
    
    // Rollback quota if job wasn't dispatched successfully
    if (quotaIncremented && !jobDispatched) {
       if (user?.id) {
         await prisma.user.update({
           where: { id: user.id },
           data: { scansUsedThisMonth: { decrement: 1 } }
         }).catch(e => logger.error("Failed to rollback quota", e));
       } else {
         const ip = req.ip || req.connection?.remoteAddress || "unknown";
         await connection.decr(`guest_scan_limit:${ip}`).catch(e => logger.error("Failed to rollback guest limit", e));
       }
    }

    if (err.name === "ZodError" || err instanceof SyntaxError) {
      return res.status(500).json({ error: "Received malformed AI response. Please try again." });
    }
    res.status(500).json({ error: "Failed to process AI analysis. Please check your data limits and try again." });
  }
});
analyzeRouter.get("/status/:jobId", optionalAuth, async (req: any, res) => {
  try {
    const { jobId } = req.params;
    
    // Check fallback jobs first
    if ((global as any).fallbackJobs && (global as any).fallbackJobs.has(jobId)) {
       const job = (global as any).fallbackJobs.get(jobId);
       if (job.state === "completed") {
         return res.json({ state: job.state, progress: job.progress, result: job.returnvalue });
       } else if (job.state === "failed") {
         return res.status(500).json({ state: job.state, error: job.error });
       }
       return res.json({ state: job.state, progress: job.progress });
    }

    const { atsQueue } = await import("../services/queue/AtsQueue");
    const job = await atsQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Security Verification: Ensure the job belongs to the authenticated user
    if (job.data.userId && job.data.userId !== req.user?.id) {
      return res.status(403).json({ error: "Unauthorized access to scan data." });
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === "completed") {
      // The result should contain { success: true, scanId, atsScore }
      return res.json({
        state,
        progress: 100,
        result: job.returnvalue
      });
    } else if (state === "failed") {
      return res.status(500).json({
        state,
        error: job.failedReason
      });
    }

    res.json({
      state,
      progress
    });
  } catch (err: any) {
    logger.error("Error fetching job status", err);
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

export default analyzeRouter;
