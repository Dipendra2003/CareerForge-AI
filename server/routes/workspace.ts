import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../lib/prisma";
import { logActivity } from "../utils/auditLogger";
import cloudinary from "../services/cloudinary";
import https from "https";
import { generateCSV, generateJSON, generatePDF, generateDOCX, prepareExportData } from "../utils/exportServerUtils";
import { NotificationService } from "../services/notification/NotificationService";

const workspaceRouter = Router();

const buildFilterQuery = (query: any) => {
  const { search, dateRange, sortBy, sortOrder, isFavorite, page = '1', limit = '10' } = query;
  
  const where: any = {};
  if (isFavorite === 'true') where.isFavorite = true;
  
  if (dateRange && dateRange !== 'all') {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    if (dateRange === 'today') {
      where.createdAt = { gte: startDate };
    } else if (dateRange === 'yesterday') {
      startDate.setDate(startDate.getDate() - 1);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    } else if (dateRange === 'last7days') {
      startDate.setDate(startDate.getDate() - 7);
      where.createdAt = { gte: startDate };
    } else if (dateRange === 'last30days') {
      startDate.setDate(startDate.getDate() - 30);
      where.createdAt = { gte: startDate };
    } else if (dateRange === 'thisMonth') {
      startDate.setDate(1);
      where.createdAt = { gte: startDate };
    }
  }
  
  const orderBy: any = {};
  if (sortBy) {
    let sortField = sortBy as string;
    if (sortField === 'date') sortField = 'createdAt';
    if (sortField === 'ats_score') sortField = 'atsScore';
    orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }
  
  const takeNum = limit === 'all' ? undefined : Math.max(1, parseInt(limit as string) || 10);
  const skip = limit === 'all' ? undefined : (Math.max(1, parseInt(page as string) || 1) - 1) * (takeNum || 10);
  
  return { where, orderBy, skip, take: takeNum, search: search as string | undefined };
};

workspaceRouter.get("/overview", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const [
      resumesCount,
      coverLettersCount,
      aiOutputsCount,
      scansCount,
      interviewPrepsCount,
      recentActivity,
      scans
    ] = await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.coverLetter.count({ where: { userId } }),
      prisma.aIOutput.count({ where: { userId } }),
      prisma.scan.count({ where: { userId } }),
      prisma.interviewPrep.count({ where: { userId } }),
      prisma.auditLog.findMany({
        where: { actorId: userId },
        orderBy: { createdAt: "desc" },
        take: 10
      }),
      prisma.scan.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { 
          id: true, 
          atsScore: true, 
          createdAt: true, 
          jobTitle: true, 
          matchedKeywords: true, 
          company: true,
          optimizedPdfUrl: true,
          optimizedPdfPublicId: true,
          optimizedPdfFileName: true,
          optimizedPdfSize: true
        }
      })
    ]);

    // Calculate progression
    let avgAts = 0;
    let highestAts = 0;
    let keywordCoverage = 0;
    let ruleFailuresCount = 0;
    const ruleFailuresTrend: any[] = [];
    let mostImprovedResume = null;
    let bestAts = 0;

    const chartData = scans.reverse().map(s => {
      if (s.atsScore && s.atsScore > highestAts) {
        highestAts = s.atsScore;
        bestAts = s.atsScore;
      }
      
      const keywords = Array.isArray(s.matchedKeywords) ? s.matchedKeywords.length : 0;
      keywordCoverage += keywords;
      
      const trace = (s as any).fullResult?.auditTrace;
      let failures = 0;
      if (trace) {
        trace.engines?.forEach((e: any) => failures += e.failedRules?.length || 0);
        ruleFailuresCount += failures;
      }

      ruleFailuresTrend.push({
        date: s.createdAt.toLocaleDateString(),
        failures
      });

      return {
        date: s.createdAt.toLocaleDateString(),
        score: s.atsScore || 0,
        jobTitle: s.jobTitle
      };
    });
    
    if (scans.length > 0) {
      avgAts = Math.round(scans.reduce((a, b) => a + (b.atsScore || 0), 0) / scans.length);
      keywordCoverage = Math.round(keywordCoverage / scans.length);
    }

    let queueHealth = { waiting: 0, active: 0, completed: 0, failed: 0 };
    try {
        const { atsQueue } = await import("../services/queue/AtsQueue");
        const counts = await atsQueue.getJobCounts('waiting', 'active', 'completed', 'failed');
        queueHealth = {
           waiting: counts.waiting,
           active: counts.active,
           completed: counts.completed,
           failed: counts.failed
        };
    } catch(e) {
        console.error("Queue health fetch error in workspace", e);
    }

    res.json({
      counts: {
        resumes: resumesCount,
        coverLetters: coverLettersCount,
        aiOutputs: aiOutputsCount,
        scans: scansCount,
        interviews: interviewPrepsCount
      },
      queueHealth,
      recentActivity,
      careerProgress: {
        avgAts,
        highestAts,
        latestAts: scans.length > 0 ? scans[scans.length - 1].atsScore : 0,
        keywordCoverage,
        ruleFailuresTrend,
        chartData
      }
    });
  } catch (error) {
    console.error("Workspace overview error:", error);
    res.status(500).json({ error: "Failed to load workspace overview" });
  }
});

// Server-side Export
workspaceRouter.post("/export", requireAuth, async (req: any, res) => {
  try {
    const { type, format, filters } = req.body;
    // Inject limit='all' to bypass skip/take
    const query = { ...filters, limit: 'all' };
    const { where, orderBy } = buildFilterQuery(query);
    where.userId = req.user.id;

    let rawData: any[] = [];
    
    // Custom search clauses per type
    if (type === 'resumes') {
      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      rawData = await prisma.resume.findMany({ where, orderBy });
    } else if (type === 'scans') {
      if (query.search) {
        where.OR = [
          { jobTitle: { contains: query.search, mode: "insensitive" } },
          { company: { contains: query.search, mode: "insensitive" } }
        ];
      }
      rawData = await prisma.scan.findMany({ where, orderBy });
      rawData = rawData.map(s => ({
        ...s,
        job_title: s.jobTitle,
        ats_score: s.atsScore,
        created_at: s.createdAt,
        matched_kw: s.matchedKeywords,
        missing_kw: s.missingKeywords
      }));
    } else if (type === 'ai-outputs') {
      if (query.search) {
        where.OR = [
          { type: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      rawData = await prisma.aIOutput.findMany({ where, orderBy });
    } else if (type === 'cover_letters') {
      if (query.search) {
        where.OR = [
          { tone: { contains: query.search, mode: 'insensitive' } },
          { content: { contains: query.search, mode: 'insensitive' } }
        ];
      }
      rawData = await prisma.coverLetter.findMany({ where, orderBy });
    } else if (type === 'interviews') {
      if (query.search) {
        where.name = { contains: query.search, mode: 'insensitive' };
      }
      rawData = await prisma.interviewPrep.findMany({ where, orderBy });
    } else {
      return res.status(400).json({ error: "Invalid export type" });
    }

    if (rawData.length === 0) {
      return res.status(400).json({ error: "No data to export" });
    }

    // Prepare data
    const exportData = prepareExportData(rawData);
    const exportFilename = `${type}_export_${new Date().toISOString().split('T')[0]}`;

    // Log the export
    await logActivity({
      req,
      action: 'Export Data',
      module: 'Workspace',
      description: `Exported ${rawData.length} ${type} to ${format}`
    });

    if (format === 'json') {
      const dataStr = generateJSON(rawData); // un-flattened for JSON
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${exportFilename}.json"`);
      return res.send(dataStr);
    } else if (format === 'csv') {
      const csvStr = generateCSV(exportData);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${exportFilename}.csv"`);
      return res.send(csvStr);
    } else if (format === 'pdf') {
      const pdfBuffer = generatePDF(exportData, type);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${exportFilename}.pdf"`);
      return res.send(pdfBuffer);
    } else if (format === 'docx') {
      const docxBuffer = await generateDOCX(exportData, type);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${exportFilename}.docx"`);
      return res.send(docxBuffer);
    } else {
      return res.status(400).json({ error: "Invalid format" });
    }
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ error: "Export failed" });
  }
});

// Resume Library
workspaceRouter.get("/resumes", requireAuth, async (req: any, res) => {
  try {
    const { where, orderBy, skip, take, search } = buildFilterQuery(req.query);
    where.userId = req.user.id;
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [resumes, total] = await Promise.all([
      prisma.resume.findMany({ where, orderBy, skip, take }),
      prisma.resume.count({ where })
    ]);
    
    res.json({ resumes, total, page: parseInt(req.query.page as string || '1'), limit: take });
  } catch (error) {
    console.error("[Workspace] Error fetching resumes:", error);
    res.status(500).json({ error: "Failed to load resumes" });
  }
});

workspaceRouter.post("/resumes", requireAuth, async (req: any, res) => {
  try {
    const { name, content, fileUrl, filePublicId, fileSize, mimeType, tags } = req.body;
    
    const resume = await prisma.resume.create({
      data: {
        userId: req.user.id,
        name: name || "Untitled Resume",
        content,
        fileUrl,
        filePublicId,
        fileSize,
        mimeType,
        tags: tags || []
      }
    });

    await logActivity({ req, action: 'Upload', module: 'Workspace', description: `Uploaded new resume: ${resume.name}` });

    await NotificationService.sendWorkspace(
      req.user.id,
      "Resume Uploaded",
      `Successfully added ${resume.name} to your library.`
    );
    
    res.json({ resume });
  } catch (error) {
    console.error("[Workspace] Error creating resume:", error);
    res.status(500).json({ error: "Failed to create resume" });
  }
});

workspaceRouter.patch("/resumes/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, content, isFavorite, isArchived, tags } = req.body;
    const resume = await prisma.resume.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name, content, isFavorite, isArchived, tags }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update resume" });
  }
});

workspaceRouter.delete("/resumes/:id", requireAuth, async (req: any, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    // Cleanup Cloudinary file
    if (resume.filePublicId) {
      try {
        await cloudinary.uploader.destroy(resume.filePublicId, { resource_type: "raw" });
      } catch (cloudinaryError) {
        console.error("Cloudinary orphan deletion failed for Resume:", cloudinaryError);
      }
    }

    await prisma.resume.delete({
      where: { id: resume.id }
    });
    
    await logActivity({ req, action: 'Resume Deleted', module: 'Workspace', description: `Deleted resume: ${resume.id}` });
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

// Secure Proxy Download
workspaceRouter.get("/download/resume/:id", requireAuth, async (req: any, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!resume || !resume.fileUrl) {
      return res.status(404).json({ error: "File not found" });
    }
    
    await logActivity({ req, action: 'Download', module: 'Workspace', description: `Downloaded resume: ${resume.id}` });

    res.setHeader("Content-Type", resume.mimeType || "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${resume.name || 'resume'}.pdf"`);
    
    https.get(resume.fileUrl, (proxyRes) => {
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error("Proxy download error:", err);
      res.status(500).end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Download failed" });
  }
});

// Log Export
workspaceRouter.post("/log-export", requireAuth, async (req: any, res) => {
  try {
    const { type, format, count } = req.body;
    await logActivity({ req, action: 'Export', module: 'Workspace', description: `Exported ${count} ${type} to ${format.toUpperCase()}` });
    
    await NotificationService.sendSystem(
      req.user.id,
      "Export Completed",
      `Successfully exported ${count} ${type} to ${format.toUpperCase()}.`
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to log export" });
  }
});

// AI Outputs
workspaceRouter.get("/ai-outputs", requireAuth, async (req: any, res) => {
  try {
    const { where, orderBy, skip, take, search } = buildFilterQuery(req.query);
    where.userId = req.user.id;
    
    if (search) {
      where.OR = [
        { type: { contains: search, mode: 'insensitive' } },
        { prompt: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [aiOutputs, total] = await Promise.all([
      prisma.aIOutput.findMany({ where, orderBy, skip, take }),
      prisma.aIOutput.count({ where })
    ]);
    res.json({ aiOutputs, total, page: parseInt(req.query.page as string || '1'), limit: take });
  } catch (error) {
    res.status(500).json({ error: "Failed to load AI outputs" });
  }
});

workspaceRouter.post("/ai-outputs", requireAuth, async (req: any, res) => {
  try {
    const { type, prompt, content } = req.body;
    const output = await prisma.aIOutput.create({
      data: {
        userId: req.user.id,
        type,
        prompt,
        content
      }
    });
    res.json({ output });
  } catch (error) {
    res.status(500).json({ error: "Failed to save AI output" });
  }
});

workspaceRouter.patch("/ai-outputs/:id", requireAuth, async (req: any, res) => {
  try {
    const { isFavorite } = req.body;
    await prisma.aIOutput.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isFavorite }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update AI output" });
  }
});

workspaceRouter.delete("/ai-outputs/:id", requireAuth, async (req: any, res) => {
  try {
    await prisma.aIOutput.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete AI output" });
  }
});

// Cover Letters
workspaceRouter.get("/cover-letters", requireAuth, async (req: any, res) => {
  try {
    const { where, orderBy, skip, take, search } = buildFilterQuery(req.query);
    where.userId = req.user.id;
    
    if (search) {
      where.OR = [
        { tone: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [coverLetters, total] = await Promise.all([
      prisma.coverLetter.findMany({ where, orderBy, skip, take }),
      prisma.coverLetter.count({ where })
    ]);
    res.json({ coverLetters, total, page: parseInt(req.query.page as string || '1'), limit: take });
  } catch (error) {
    res.status(500).json({ error: "Failed to load cover letters" });
  }
});

workspaceRouter.patch("/cover-letters/:id", requireAuth, async (req: any, res) => {
  try {
    const { content, tone, isFavorite } = req.body;
    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (tone !== undefined) updateData.tone = tone;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    
    await prisma.coverLetter.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: updateData
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update cover letter" });
  }
});

workspaceRouter.delete("/cover-letters/:id", requireAuth, async (req: any, res) => {
  try {
    await prisma.coverLetter.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete cover letter" });
  }
});

// Interview Preps
workspaceRouter.get("/interviews", requireAuth, async (req: any, res) => {
  try {
    const { where, orderBy, skip, take, search } = buildFilterQuery(req.query);
    where.userId = req.user.id;
    
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [interviews, total] = await Promise.all([
      prisma.interviewPrep.findMany({ where, orderBy, skip, take }),
      prisma.interviewPrep.count({ where })
    ]);
    res.json({ interviews, total, page: parseInt(req.query.page as string || '1'), limit: take });
  } catch (error) {
    res.status(500).json({ error: "Failed to load interviews" });
  }
});

workspaceRouter.patch("/interviews/:id", requireAuth, async (req: any, res) => {
  try {
    const { name, isFavorite } = req.body;
    await prisma.interviewPrep.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name, isFavorite }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update interview" });
  }
});

workspaceRouter.delete("/interviews/:id", requireAuth, async (req: any, res) => {
  try {
    await prisma.interviewPrep.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete interview" });
  }
});

// Resumes
workspaceRouter.delete("/resumes/:id", requireAuth, async (req: any, res) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!resume) return res.status(404).json({ error: "Resume not found" });

    // Intentionally not deleting Cloudinary file because it's shared with Scan history
    await prisma.resume.delete({
      where: { id: resume.id }
    });
    
    await logActivity({ req, action: 'Resume Deleted', module: 'Workspace', description: `Deleted resume: ${resume.id}` });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

// Scans
workspaceRouter.delete("/scans/:id", requireAuth, async (req: any, res) => {
  try {
    const scan = await prisma.scan.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!scan) return res.status(404).json({ error: "Scan not found" });

    // We intentionally DO NOT delete Cloudinary files here because the same file URL and public ID
    // is shared with the Resume Library object. Deleting it here would break the Resume Library.

    await prisma.scan.delete({
      where: { id: scan.id }
    });
    
    await logActivity({ req, action: 'Scan Deleted', module: 'Workspace', description: `Deleted scan: ${scan.id}` });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete scan" });
  }
});

// Secure Proxy Download for Scans
workspaceRouter.get("/download/scan/:id/:type", requireAuth, async (req: any, res) => {
  try {
    const { id, type } = req.params;
    const scan = await prisma.scan.findFirst({
      where: { id, userId: req.user.id }
    });
    
    if (!scan) return res.status(404).json({ error: "Scan not found" });
    
    let targetUrl = type === 'optimized' ? scan.optimizedPdfUrl : scan.resumeFileUrl;
    let fileName = type === 'optimized' ? scan.optimizedPdfFileName || 'optimized_resume.pdf' : scan.resumeFileName || 'original_resume.pdf';
    
    if (!targetUrl) return res.status(404).json({ error: "File not found" });

    await logActivity({ req, action: 'Download', module: 'Workspace', description: `Downloaded scan ${type} PDF: ${scan.id}` });
    
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    
    https.get(targetUrl, (proxyRes) => {
      proxyRes.pipe(res);
    }).on('error', (err) => {
      console.error("Proxy download error:", err);
      res.status(500).end();
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Download failed" });
  }
});

// Upload optimized PDF for a scan
workspaceRouter.post("/scans/:scanId/optimized-pdf", requireAuth, async (req: any, res) => {
  try {
    const { scanId } = req.params;
    const { pdfUrl, pdfPublicId, pdfFileName, pdfSize } = req.body;
    
    // Verify scan belongs to user
    const scan = await prisma.scan.findFirst({
      where: { id: scanId, userId: req.user.id }
    });
    
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }
    
    // Cleanup old optimized PDF from Cloudinary if replacing
    if (scan.optimizedPdfPublicId && scan.optimizedPdfPublicId !== pdfPublicId) {
      try {
        await cloudinary.uploader.destroy(scan.optimizedPdfPublicId, { resource_type: "raw" });
      } catch (e) {
        console.error("Failed to delete old optimized PDF:", e);
      }
    }
    
    // Update scan with optimized PDF info
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        optimizedPdfUrl: pdfUrl,
        optimizedPdfPublicId: pdfPublicId,
        optimizedPdfFileName: pdfFileName,
        optimizedPdfSize: pdfSize
      }
    });
    
    res.json({ success: true, message: "Optimized PDF saved successfully" });
  } catch (error) {
    console.error("Failed to save optimized PDF:", error);
    res.status(500).json({ error: "Failed to save optimized PDF" });
  }
});

export default workspaceRouter;
