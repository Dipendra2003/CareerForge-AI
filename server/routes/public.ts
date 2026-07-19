import { Router } from 'express';
import prisma from '../lib/prisma';

const publicRouter = Router();

const defaultSettings = {
  id: "default",
  guestScanLimit: 1,
  freeScanLimit: 3,
  proScanLimit: 999999,
  annualScanLimit: 999999,
  maxResumeUploadSize: 5242880, // 5MB
  maxResumeCharacters: 20000,
  maxJDCharacters: 10000,
  maxAIRequestsPerMinute: 20,
  maxUploadsPerDay: 50,
  allowGuestScans: true,
  allowSignup: true,
  allowGoogleLogin: true,
  allowEmailLogin: true,
  companyName: "CareerForge AI",
  companyTagline: "AI-Powered Resume Builder & Analyzer",
  companyDescription: "Analyze and optimize your resume against any job description using advanced AI.",
  supportEmail: "support@example.com",
  primaryColor: "#4f46e5",
  secondaryColor: "#ec4899",
  defaultCurrency: "USD",
  timezone: "UTC",
  defaultLanguage: "en",
  dateFormat: "MM/DD/YYYY",
  maintenanceMode: false,
  announcementIsActive: false,
};

const defaultPlans = [
  {
    id: "free",
    name: "Free",
    slug: "free",
    monthlyPrice: 0,
    annualPrice: 0,
    isActive: true,
    features: [
      { feature: { name: "Basic ATS Analyzer", isActive: true } },
      { feature: { name: "1 Saved Resume", isActive: true } }
    ]
  },
  {
    id: "pro",
    name: "Pro",
    slug: "pro",
    monthlyPrice: 19,
    annualPrice: 149,
    isActive: true,
    features: [
      { feature: { name: "Advanced AI Feedback", isActive: true } },
      { feature: { name: "Unlimited Resumes", isActive: true } },
      { feature: { name: "Cover Letter Generator", isActive: true } },
      { feature: { name: "Interview Prep Guide", isActive: true } }
    ]
  }
];

const defaultFAQs = [
  {
    id: "1",
    question: "What is CareerForge AI?",
    answer: "CareerForge AI is an AI-powered resume builder, ATS analyzer, and interview prep tool that helps you optimize your resume to match specific job descriptions.",
    slug: "what-is-careerforgeai",
    isPublished: true,
    isFeatured: true,
    displayOrder: 1,
    category: { name: "General" }
  },
  {
    id: "2",
    question: "How does the ATS score analyzer work?",
    answer: "We analyze your resume text against the job description to find missing keywords, evaluate formatting, and generate specific action items to boost your match rate.",
    slug: "how-does-ats-analyzer-work",
    isPublished: true,
    isFeatured: true,
    displayOrder: 2,
    category: { name: "Features" }
  }
];

const defaultCategories = [
  { id: "gen", name: "General", slug: "general", displayOrder: 1 },
  { id: "feat", name: "Features", slug: "features", displayOrder: 2 }
];

publicRouter.get('/config', async (req, res) => {
  try {
    const [plans, features, settings, promotions] = await Promise.all([
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        include: {
          features: {
            where: { enabled: true },
            include: { feature: true }
          }
        }
      }),
      prisma.feature.findMany({ where: { isActive: true } }),
      prisma.systemSetting.findFirst(),
      prisma.promotion.findMany({ 
          where: { 
              isActive: true,
              OR: [
                  { startDate: null },
                  { startDate: { lte: new Date() } }
              ],
              AND: [
                  { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }
              ]
          } 
      })
    ]);
    res.json({ plans, features, settings: settings || defaultSettings, promotions, databaseConnected: true });
  } catch (error: any) {
    console.warn('Database not reachable or unconfigured, serving robust default config:', error.message || error);
    res.json({
      plans: defaultPlans,
      features: [],
      settings: defaultSettings,
      databaseConnected: false,
      warning: "Database is unconfigured. Please configure DATABASE_URL in your Settings."
    });
  }
});

publicRouter.get('/faqs', async (req, res) => {
  try {
    const { search, categoryId, isFeatured, page = 1, limit = 100 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { isPublished: true };
    if (search) {
      where.OR = [
        { question: { contains: String(search), mode: 'insensitive' } },
        { answer: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (isFeatured !== undefined && isFeatured !== '') where.isFeatured = isFeatured === 'true';

    const [faqs, categories] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        include: { category: true },
        orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.fAQCategory.findMany({
        orderBy: { displayOrder: 'asc' }
      })
    ]);

    res.json({ faqs, categories, databaseConnected: true });
  } catch (error: any) {
    console.warn('Database not reachable, serving fallback static FAQs:', error.message || error);
    res.json({
      faqs: defaultFAQs,
      categories: defaultCategories,
      databaseConnected: false,
      warning: "Database is unconfigured. Please configure DATABASE_URL in your Settings."
    });
  }
});

publicRouter.get('/landing', async (req, res) => {
  try {
    const [sections, hero, stats, features, partners, testimonials, ctas, newsletters, steps] = await Promise.all([
      prisma.landingSection.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingHero.findFirst(),
      prisma.landingStatistic.findMany({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.landingFeature.findMany({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.landingPartner.findMany({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.landingTestimonial.findMany({ 
        where: { isPublished: true }, 
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        take: 3
      }),
      prisma.landingCTA.findMany({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } }),
      prisma.landingNewsletter.findFirst({ where: { isPublished: true } }),
      (prisma as any).landingStep.findMany({ where: { isPublished: true }, orderBy: { displayOrder: 'asc' } })
    ]);
    res.json({ sections, hero, stats, features, partners, testimonials, ctas, newsletters, steps });
  } catch (error: any) {
    console.warn('Database not reachable, serving fallback static landing config:', error.message || error);
    res.json({
      sections: [],
      hero: null,
      stats: [],
      features: [],
      partners: [],
      testimonials: [],
      ctas: [],
      newsletters: null,
      steps: [],
      databaseConnected: false
    });
  }
});

// GET /api/public/seo/settings
publicRouter.get('/seo/settings', async (req, res) => {
  try {
    const settings = await prisma.sEOSetting.findFirst();
    res.json({ globalFavicon: settings?.globalFavicon });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/public/seo/:pageKey
publicRouter.get('/seo/:pageKey', async (req, res) => {
  try {
    const { pageKey } = req.params;
    const page = await prisma.sEOPage.findUnique({ where: { pageKey } });
    if (page) {
      res.json(page);
    } else {
      res.status(404).json({ error: "Page not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/public/scans/:id
publicRouter.get('/scans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.scan.findUnique({ where: { id } });
    if (!data) {
      return res.status(404).json({ error: "Scan not found" });
    }
    
    // UI mapping shim (same as authenticated route)
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
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default publicRouter;
