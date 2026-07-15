import { Router } from 'express';
import prisma from '../../lib/prisma';
import { getStripe } from '../stripe';

const analyticsRouter = Router();

analyticsRouter.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const parseLocalDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
      }
      return new Date();
    };

    const startDate = from ? parseLocalDate(from as string) : new Date();
    if (!from) {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    
    const endDate = to ? parseLocalDate(to as string) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const todayMidnight = new Date();
    todayMidnight.setHours(0,0,0,0);
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0,0,0,0);
    
    const dateFilter = {
      gte: startDate,
      lte: endDate
    };

    // SECTION 1: USER ANALYTICS
    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      adminUsers,
      newUsersToday,
      newUsersWeek,
      newUsersMonth,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({ where: { isSuspended: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({ where: { createdAt: { gte: todayMidnight } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } })
    ]);

    const dailySignupsRaw: any[] = await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count
      FROM "User"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    const dailySignups = dailySignupsRaw.map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      count: Number(d.count)
    }));
    
    // Retention / Churn Tracking
    // We define Retention Rate as: Users who signed up > 30 days ago and have logged in within the last 30 days.
    const usersCreatedOver30DaysAgo = await prisma.user.count({
        where: { createdAt: { lt: thirtyDaysAgo } }
    });
    
    const usersRetained = await prisma.user.count({
        where: { 
            createdAt: { lt: thirtyDaysAgo },
            lastLoginAt: { gte: thirtyDaysAgo } 
        }
    });
    
    const retentionRate = usersCreatedOver30DaysAgo > 0 ? (usersRetained / usersCreatedOver30DaysAgo) * 100 : 0;

    // SECTION 2: SUBSCRIPTION ANALYTICS
    // We now fetch real cancellations from BillingHistory
    const cancelledSubscriptions = await prisma.billingHistory.count({
        where: { action: 'cancelled', createdAt: dateFilter }
    });
    
    const activeSubscriptions = await prisma.user.count({ where: { NOT: { plan: 'free' }, subscriptionId: { not: null } } });
    const churnRate = activeSubscriptions > 0 ? (cancelledSubscriptions / (activeSubscriptions + cancelledSubscriptions)) * 100 : 0;

    const [freeUsers, proUsers, annualUsers, trialUsers] = await Promise.all([
      prisma.user.count({ where: { OR: [{ plan: 'free' }, { plan: 'Free' }, { plan: '' }] } }),
      prisma.user.count({ where: { plan: { equals: 'pro', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan: { equals: 'annual', mode: 'insensitive' } } }),
      prisma.user.count({ where: { plan: { equals: 'trial', mode: 'insensitive' } } }),
    ]);

    const usersByPlan = await prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true }
    });

    // SECTION 3: ATS ANALYTICS
    const [totalScans, todayScans, weekScans, monthScans] = await Promise.all([
      prisma.scan.count(),
      prisma.scan.count({ where: { createdAt: { gte: todayMidnight } } }),
      prisma.scan.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.scan.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ]);

    const dailyScansRaw: any[] = await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as count, AVG("atsScore") as avgScore, MAX("atsScore") as maxScore, MIN("atsScore") as minScore
      FROM "Scan"
      WHERE "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY DATE_TRUNC('day', "createdAt")
      ORDER BY date ASC
    `;

    const dailyScans = dailyScansRaw.map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      count: Number(d.count),
      avgScore: Number(d.avgscore) || 0,
      maxScore: Number(d.maxscore) || 0,
      minScore: Number(d.minscore) || 0,
    }));
    
    const atsScores = await prisma.scan.aggregate({
      _avg: { atsScore: true },
      _max: { atsScore: true },
      _min: { atsScore: true }
    });

    const topJobTitlesRaw: any[] = await prisma.$queryRaw`
      SELECT "jobTitle", COUNT(*) as count
      FROM "Scan"
      WHERE "jobTitle" IS NOT NULL AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY "jobTitle"
      ORDER BY count DESC
      LIMIT 10
    `;

    const topJobTitles = topJobTitlesRaw.map(d => ({
      name: d.jobTitle,
      count: Number(d.count)
    }));

    // SECTION 4: AI ANALYTICS
    const [totalCoverLetters, totalInterviewPreps, totalBulletRewrites, totalLinkedinOpts] = await Promise.all([
      prisma.coverLetter.count(),
      prisma.interviewPrep.count(),
      prisma.aIOutput.count({ where: { type: 'bullet_rewriter' } }),
      prisma.aIOutput.count({ where: { type: 'linkedin_optimization' } })
    ]);
    
    const aiFeatureUsage = [
      { name: 'ATS Scans', count: totalScans },
      { name: 'Cover Letters', count: totalCoverLetters },
      { name: 'Interview Prep', count: totalInterviewPreps },
      { name: 'Bullet Rewriter', count: totalBulletRewrites },
      { name: 'LinkedIn Opt', count: totalLinkedinOpts }
    ];

    // SECTION 5: STORAGE ANALYTICS
    const storageStats = await prisma.scan.aggregate({
      _sum: { resumeFileSize: true },
      _count: { resumeFileUrl: true }
    });

    // SECTION 6: BILLING ANALYTICS - EXACT REVENUE FROM STRIPE (CACHED)
    let mrr = 0;
    let arr = 0;
    
    try {
        const cache = await prisma.financialAnalyticsCache.findUnique({
            where: { id: 'current' }
        });
        if (cache) {
            mrr = cache.mrr;
            arr = cache.arr;
        } else {
            // Trigger an async background sync if cache is missing
            import('../../lib/cron').then(cronLib => cronLib.runStripeReconciliation()).catch(() => {});
        }
    } catch (e) {
        console.error("Failed to read financial cache", e);
    }

    // SECTION 7: SYSTEM HEALTH - EXACT API METRICS
    const totalApiRequestsAgg = await prisma.apiMetric.aggregate({
        _sum: { count: true }
    });
    const totalApiRequests = Number(totalApiRequestsAgg._sum.count) || 0;
    
    const emailStats = await prisma.emailLog.groupBy({
      by: ['status'],
      _count: true,
      where: { createdAt: dateFilter }
    });

    const emailSent = emailStats.find(s => s.status === 'Sent')?._count || 0;
    const emailFailed = emailStats.find(s => s.status === 'Failed')?._count || 0;
    const totalEmails = emailSent + emailFailed;
    const emailSuccessRate = totalEmails > 0 ? (emailSent / totalEmails) * 100 : 0;
    const emailFailureRate = totalEmails > 0 ? (emailFailed / totalEmails) * 100 : 0;

    res.json({
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newWeek: newUsersWeek,
        newMonth: newUsersMonth,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        active: activeUsers,
        admin: adminUsers,
        retentionRate,
        dailySignups
      },
      subscriptions: {
        free: freeUsers,
        pro: proUsers,
        annual: annualUsers,
        trial: trialUsers,
        active: activeSubscriptions,
        cancelled: cancelledSubscriptions,
        churnRate,
        byPlan: usersByPlan
      },
      ats: {
        totalScans,
        todayScans,
        weekScans,
        monthScans,
        avgScore: atsScores._avg.atsScore || 0,
        maxScore: atsScores._max.atsScore || 0,
        minScore: atsScores._min.atsScore || 0,
        dailyScans,
        topJobTitles
      },
      ai: {
        totalRequests: totalScans + totalCoverLetters + totalInterviewPreps + totalBulletRewrites + totalLinkedinOpts,
        atsRequests: totalScans,
        coverLetterRequests: totalCoverLetters,
        interviewPrepRequests: totalInterviewPreps,
        bulletRewriterRequests: totalBulletRewrites,
        linkedinOptRequests: totalLinkedinOpts,
        featureUsage: aiFeatureUsage
      },
      storage: {
        totalUploads: storageStats._count.resumeFileUrl || 0,
        totalBytesUsed: storageStats._sum.resumeFileSize || 0,
        avgSize: (storageStats._count.resumeFileUrl || 0) > 0 
          ? (storageStats._sum.resumeFileSize || 0) / (storageStats._count.resumeFileUrl || 1) 
          : 0
      },
      billing: {
        mrr,
        arr,
        avgRevenuePerUser: totalUsers > 0 ? (mrr / totalUsers) : 0
      },
      system: {
        totalApiRequests,
        emailSuccessRate,
        emailFailureRate
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default analyticsRouter;
