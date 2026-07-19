import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';

const landingRouter = Router();

// Define generic routes for a model
const generateCrudRoutes = (router: Router, modelName: string, idField: string = 'id') => {
  const modelDelegate = (prisma as any)[modelName];

  router.get(`/${modelName}`, async (req, res) => {
    try {
      const items = await modelDelegate.findMany({
        orderBy: { displayOrder: 'asc' }
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch ${modelName}` });
    }
  });

  router.get(`/${modelName}/:id`, async (req, res) => {
    try {
      const item = await modelDelegate.findUnique({ where: { [idField]: req.params.id } });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch ${modelName}` });
    }
  });

  router.post(`/${modelName}`, async (req, res) => {
    try {
      const item = await modelDelegate.create({ data: req.body });
      await logAdminAction(req, `Create ${modelName}`, null, null, JSON.stringify(item));
      res.status(201).json(item);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to create ${modelName}`, details: error.message });
    }
  });

  router.put(`/${modelName}/:id`, async (req, res) => {
    try {
      const item = await modelDelegate.update({
        where: { [idField]: req.params.id },
        data: req.body
      });
      await logAdminAction(req, `Update ${modelName}`, null, null, JSON.stringify(item));
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to update ${modelName}`, details: error.message });
    }
  });

  router.delete(`/${modelName}/:id`, async (req, res) => {
    try {
      await modelDelegate.delete({ where: { [idField]: req.params.id } });
      await logAdminAction(req, `Delete ${modelName}`, null, null, null);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: `Failed to delete ${modelName}`, details: error.message });
    }
  });
  
  router.put(`/${modelName}/reorder/bulk`, async (req, res) => {
    try {
      const { items } = req.body;
      for (const item of items) {
         await modelDelegate.update({
            where: { [idField]: item.id },
            data: { displayOrder: item.displayOrder }
         });
      }
      await logAdminAction(req, `Reorder ${modelName}`, null, null, null);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to reorder ${modelName}`, details: error.message });
    }
  });
};

// Hero and Newsletter are singletons practically, but we'll use first/upsert logic
landingRouter.get('/hero', async (req, res) => {
  try {
    let hero = await prisma.landingHero.findFirst();
    if (!hero) {
      hero = await prisma.landingHero.create({ data: { title: 'Welcome' } });
    }
    res.json(hero);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hero' });
  }
});

landingRouter.put('/hero', async (req, res) => {
  try {
    let hero = await prisma.landingHero.findFirst();
    if (hero) {
      hero = await prisma.landingHero.update({
        where: { id: hero.id },
        data: req.body
      });
    } else {
      hero = await prisma.landingHero.create({ data: req.body });
    }
    await logAdminAction(req, `Update landingHero`, null, null, JSON.stringify(hero));
    res.json(hero);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update hero', details: error.message });
  }
});

landingRouter.get('/newsletter', async (req, res) => {
  try {
    let newsletter = await prisma.landingNewsletter.findFirst();
    if (!newsletter) {
      newsletter = await prisma.landingNewsletter.create({ data: { title: 'Subscribe' } });
    }
    res.json(newsletter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch newsletter' });
  }
});

landingRouter.put('/newsletter', async (req, res) => {
  try {
    let newsletter = await prisma.landingNewsletter.findFirst();
    if (newsletter) {
      newsletter = await prisma.landingNewsletter.update({
        where: { id: newsletter.id },
        data: req.body
      });
    } else {
      newsletter = await prisma.landingNewsletter.create({ data: req.body });
    }
    await logAdminAction(req, `Update landingNewsletter`, null, null, JSON.stringify(newsletter));
    res.json(newsletter);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update newsletter', details: error.message });
  }
});

// Admin-specific aggregate endpoint — returns ALL items including unpublished
landingRouter.get('/all', async (req, res) => {
  try {
    // Auto-create default sections if missing
    const defaultSections = ['hero', 'stats', 'howItWorks', 'features', 'pricing', 'testimonials', 'faq', 'newsletter', 'cta', 'partners'];
    const existingSections = await prisma.landingSection.findMany({ orderBy: { displayOrder: 'asc' } });
    for (let i = 0; i < defaultSections.length; i++) {
      const name = defaultSections[i];
      if (!existingSections.find(s => s.name === name)) {
        await prisma.landingSection.create({ data: { name, displayOrder: i } });
      }
    }

    // Auto-create hero if missing
    let hero = await prisma.landingHero.findFirst();
    if (!hero) {
      hero = await prisma.landingHero.create({ 
        data: { 
          title: 'Transform your resume into an interview magnet',
          subtitle: 'AI-Powered Career Intelligence Platform',
          description: 'Stop getting rejected by ATS filters. Our AI analyzes your resume against any job description, identifies missing keywords, rewrites weak bullets, generates tailored cover letters, and prepares you for interviews — all in under 30 seconds.',
          primaryButtonText: 'Analyze Your Resume — Free',
          secondaryButtonText: 'Explore AI Tools'
        } 
      });
    }

    // Auto-create newsletter if missing
    let newsletters = await prisma.landingNewsletter.findFirst();
    if (!newsletters) {
      newsletters = await prisma.landingNewsletter.create({ 
        data: { 
          title: 'Stay Ahead in Your Job Search',
          subtitle: 'Get weekly career tips, resume optimization strategies, and job market insights delivered to your inbox.',
          buttonText: 'Subscribe'
        } 
      });
    }

    // Auto-create steps if missing
    const defaultSteps = [
      { title: "Upload Your Resume", description: "Drop your PDF or DOCX resume into our secure analyzer. We support multi-page documents with advanced text extraction.", icon: "FileText", accent: "from-indigo-500 to-blue-500", displayOrder: 0 },
      { title: "Add the Job Description", description: "Paste the target role's description. Our AI instantly identifies critical keywords, skills, and qualification requirements.", icon: "Brain", accent: "from-violet-500 to-purple-500", displayOrder: 1 },
      { title: "Get AI-Powered Results", description: "Receive your ATS compatibility score, missing keyword analysis, optimized bullet rewrites, and a tailored cover letter — all in seconds.", icon: "Sparkles", accent: "from-amber-500 to-orange-500", displayOrder: 2 }
    ];
    const existingSteps = await (prisma as any).landingStep.findMany();
    if (existingSteps.length === 0) {
      for (const step of defaultSteps) {
        await (prisma as any).landingStep.create({ data: step });
      }
    }

    const existingStats = await prisma.landingStatistic.findMany();
    if (existingStats.length === 0) {
      const defaultStats = [
        { title: "75%", subtitle: "Resumes Rejected by ATS", description: "Most never reach a human reviewer", icon: "BarChart3", displayOrder: 0 },
        { title: "<30s", subtitle: "AI Analysis Speed", description: "Instant comprehensive feedback", icon: "Zap", displayOrder: 1 },
        { title: "2.4×", subtitle: "More Interview Callbacks", description: "Average improvement for users", icon: "TrendingUp", displayOrder: 2 },
        { title: "50K+", subtitle: "Resumes Optimized", description: "Trusted by job seekers worldwide", icon: "Users", displayOrder: 3 }
      ];
      for (const stat of defaultStats) { await prisma.landingStatistic.create({ data: stat }); }
    }

    const existingFeatures = await prisma.landingFeature.findMany();
    if (existingFeatures.length === 0) {
      const defaultFeatures = [
        { icon: "Target", title: "Smart Keyword Matching", description: "Automatically identifies and maps critical keywords from job descriptions to your resume, highlighting gaps the ATS will penalize.", displayOrder: 0 },
        { icon: "BarChart3", title: "ATS Score Analysis", description: "Get an instant compatibility score with detailed breakdowns showing exactly what's working and what needs improvement.", displayOrder: 1 },
        { icon: "PenTool", title: "AI Bullet Rewrites", description: "Transform weak resume bullets into powerful, quantified achievement statements that pass ATS filters and impress recruiters.", displayOrder: 2 },
        { icon: "FileText", title: "Cover Letter Generator", description: "Generate personalized, role-specific cover letters that reference exact requirements from the job description.", displayOrder: 3 },
        { icon: "Brain", title: "Interview Preparation", description: "Receive predicted interview questions based on the role, plus AI-coached answers aligned with your experience.", displayOrder: 4 },
        { icon: "TrendingUp", title: "LinkedIn Optimization", description: "Align your LinkedIn headline, summary, and skills section with current recruiter search patterns and algorithms.", displayOrder: 5 }
      ];
      for (const feat of defaultFeatures) { await prisma.landingFeature.create({ data: feat }); }
    }

    const existingPartners = await prisma.landingPartner.findMany();
    if (existingPartners.length === 0) {
      const defaultPartners = [
        { title: 'Career Changers', websiteUrl: 'Transition confidently with AI-guided resume optimization.', icon: 'TrendingUp', displayOrder: 0 },
        { title: 'Recent Graduates', websiteUrl: 'Stand out from thousands of applicants with ATS-perfect formatting.', icon: 'Award', displayOrder: 1 },
        { title: 'Tech Professionals', websiteUrl: 'Match technical keywords that automated screening systems require.', icon: 'Laptop', displayOrder: 2 },
        { title: 'Job Seekers Worldwide', websiteUrl: 'Optimize for global job markets and international companies.', icon: 'Users', displayOrder: 3 }
      ];
      for (const part of defaultPartners) { await prisma.landingPartner.create({ data: part }); }
    }

    const existingTestimonials = await prisma.landingTestimonial.findMany();
    if (existingTestimonials.length === 0) {
      const defaultTestimonials = [
        { title: "Sarah J.", subtitle: "Software Engineer", company: "Google", description: "The AI analysis spotted keywords I completely missed. My ATS score went from 42% to 95%, and I landed interviews at three MAANG companies within a month.", achievement: "Got 3 Offers", rating: 5, displayOrder: 0 },
        { title: "Michael T.", subtitle: "Product Manager", company: "Stripe", description: "I was struggling to transition from sales to product management. CareerForge helped me reframe my experience to match PM job descriptions perfectly.", achievement: "Career Pivot", rating: 5, displayOrder: 1 },
        { title: "Elena R.", subtitle: "Data Scientist", company: "Spotify", description: "The bullet point rewrites are magic. It took my generic responsibilities and turned them into quantified, impact-driven achievements that recruiters love.", achievement: "Salary +30%", rating: 5, displayOrder: 2 }
      ];
      for (const test of defaultTestimonials) { await prisma.landingTestimonial.create({ data: test }); }
    }

    const [sections, stats, features, partners, testimonials, ctas, steps] = await Promise.all([
      prisma.landingSection.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingStatistic.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingFeature.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingPartner.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingTestimonial.findMany({ orderBy: { displayOrder: 'asc' } }),
      prisma.landingCTA.findMany({ orderBy: { displayOrder: 'asc' } }),
      (prisma as any).landingStep.findMany({ orderBy: { displayOrder: 'asc' } }),
    ]);
    res.json({ sections, hero, stats, features, partners, testimonials, ctas, newsletters, steps });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch landing data' });
  }
});

// For sections (to toggle visibility and order)
landingRouter.get('/section', async (req, res) => {
  try {
    const defaultSections = ['hero', 'stats', 'howItWorks', 'features', 'pricing', 'testimonials', 'faq', 'newsletter', 'cta', 'partners'];
    const sections = await prisma.landingSection.findMany({ orderBy: { displayOrder: 'asc' } });
    
    // Auto-create missing sections
    for (let i = 0; i < defaultSections.length; i++) {
        const name = defaultSections[i];
        if (!sections.find(s => s.name === name)) {
            await prisma.landingSection.create({ data: { name, displayOrder: i } });
        }
    }
    
    const finalSections = await prisma.landingSection.findMany({ orderBy: { displayOrder: 'asc' } });
    res.json(finalSections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

landingRouter.put('/section/:id', async (req, res) => {
    try {
        const item = await prisma.landingSection.update({
            where: { id: req.params.id },
            data: req.body
        });
        await logAdminAction(req, `Update landingSection`, null, null, JSON.stringify(item));
        res.json(item);
    } catch(e) {
        res.status(500).json({ error: 'Failed to update section' });
    }
});

landingRouter.put('/section/reorder/bulk', async (req, res) => {
    try {
      const { items } = req.body;
      for (const item of items) {
         await prisma.landingSection.update({
            where: { id: item.id },
            data: { displayOrder: item.displayOrder }
         });
      }
      await logAdminAction(req, `Reorder landingSection`, null, null, null);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: `Failed to reorder landingSection`, details: error.message });
    }
});


generateCrudRoutes(landingRouter, 'landingStatistic');
generateCrudRoutes(landingRouter, 'landingFeature');
generateCrudRoutes(landingRouter, 'landingPartner');
generateCrudRoutes(landingRouter, 'landingTestimonial');
generateCrudRoutes(landingRouter, 'landingCTA');
generateCrudRoutes(landingRouter, 'landingStep');

export default landingRouter;
