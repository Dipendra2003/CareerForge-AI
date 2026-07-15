import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../lib/prisma";

const scansRouter = Router();

scansRouter.get("/", requireAuth, async (req: any, res) => {
  try {
    const { search, dateRange, sortBy, sortOrder, page = '1', limit = '10' } = req.query;
    
    let whereClause: any = { userId: req.user.id };

    if (search) {
      whereClause.OR = [
        { jobTitle: { contains: search as string, mode: "insensitive" } },
        { company: { contains: search as string, mode: "insensitive" } }
      ];
    }

    if (dateRange && dateRange !== 'all') {
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      if (dateRange === 'today') {
        whereClause.createdAt = { gte: startDate };
      } else if (dateRange === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        const endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        whereClause.createdAt = { gte: startDate, lte: endDate };
      } else if (dateRange === 'last7days') {
        startDate.setDate(startDate.getDate() - 7);
        whereClause.createdAt = { gte: startDate };
      } else if (dateRange === 'last30days') {
        startDate.setDate(startDate.getDate() - 30);
        whereClause.createdAt = { gte: startDate };
      } else if (dateRange === 'thisMonth') {
        startDate.setDate(1);
        whereClause.createdAt = { gte: startDate };
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

    const takeNum = Math.max(1, parseInt(limit as string) || 10);
    const skip = (Math.max(1, parseInt(page as string) || 1) - 1) * takeNum;

    const [scans, count] = await Promise.all([
      prisma.scan.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: takeNum
      }),
      prisma.scan.count({ where: whereClause })
    ]);
    
    // UI mapping shim
    const mappedScans = scans.map(s => ({
      ...s,
      job_title: s.jobTitle,
      ats_score: s.atsScore,
      created_at: s.createdAt,
      matched_kw: s.matchedKeywords,
      missing_kw: s.missingKeywords
    }));

    res.json({
      scans: mappedScans,
      total: count,
      page: Number(page),
      limit: Number(limit)
    });
  } catch (err) {
    console.error("GET /api/scans Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

scansRouter.get("/stats", requireAuth, async (req: any, res) => {
  try {
    const userId = req.user.id;
    
    // Aggregation query prevents loading all scans into memory
    const agg = await prisma.scan.aggregate({
      where: { userId },
      _count: true,
      _avg: { atsScore: true },
      _max: { atsScore: true }
    });

    const total = agg._count || 0;
    const avg = total > 0 ? Math.round(agg._avg.atsScore || 0) : 0;
    const highest = agg._max.atsScore || 0;
    
    // Only take the 50 most recent scans for the chart to prevent browser OOM on huge histories
    const recentScans = await prisma.scan.findMany({
      where: { userId },
      select: { atsScore: true, createdAt: true, jobTitle: true },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const chartData = recentScans
      .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((s: any) => ({
         date: new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
         score: s.atsScore,
         job: s.jobTitle
      }));
      
    // Queue Health from BullMQ
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
        console.error("Queue health fetch error", e);
    }

    res.json({
      total,
      avg,
      highest,
      chartData,
      queueHealth
    });
  } catch (err) {
    console.error("GET /api/scans/stats Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

scansRouter.get("/:id", requireAuth, async (req: any, res) => {
  try {
    const { id } = req.params;
    
    const data = await prisma.scan.findUnique({
      where: { 
        id,
        userId: req.user.id
      }
    });

    if (!data) {
      return res.status(404).json({ error: "Scan not found or access denied" });
    }
    
    // UI mapping shim
    const mappedScan = {
      ...data,
      job_title: data.jobTitle,
      ats_score: data.atsScore,
      created_at: data.createdAt,
      matched_kw: data.matchedKeywords,
      missing_kw: data.missingKeywords,
      resume_text: data.resumeText,
      job_description: data.jobDescription
    };

    res.json({ scan: mappedScan });
  } catch (err) {
    console.error("GET /api/scans/:id Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

scansRouter.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    await prisma.scan.deleteMany({
      where: { id: req.params.id, userId: req.user.id }
    });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/scans/:id Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default scansRouter;
