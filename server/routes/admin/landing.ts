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
      await logAdminAction(req, `Create ${modelName}`, item[idField], null, JSON.stringify(item));
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
      await logAdminAction(req, `Update ${modelName}`, req.params.id, null, JSON.stringify(item));
      res.json(item);
    } catch (error: any) {
      res.status(500).json({ error: `Failed to update ${modelName}`, details: error.message });
    }
  });

  router.delete(`/${modelName}/:id`, async (req, res) => {
    try {
      await modelDelegate.delete({ where: { [idField]: req.params.id } });
      await logAdminAction(req, `Delete ${modelName}`, req.params.id, null, null);
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
    await logAdminAction(req, `Update landingHero`, hero.id, null, JSON.stringify(hero));
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
    await logAdminAction(req, `Update landingNewsletter`, newsletter.id, null, JSON.stringify(newsletter));
    res.json(newsletter);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update newsletter', details: error.message });
  }
});

// For sections (to toggle visibility and order)
landingRouter.get('/section', async (req, res) => {
  try {
    const defaultSections = ['hero', 'stats', 'features', 'pricing', 'testimonials', 'faq', 'newsletter', 'cta', 'partners'];
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
        await logAdminAction(req, `Update landingSection`, item.id, null, JSON.stringify(item));
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

export default landingRouter;
