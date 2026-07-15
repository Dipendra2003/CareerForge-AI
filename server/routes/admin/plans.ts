import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';

const plansRouter = Router();

plansRouter.get('/', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        features: {
          include: { feature: true }
        }
      }
    });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

plansRouter.post('/', async (req, res) => {
  try {
    const { name, slug, description, monthlyPrice, annualPrice, currency, durationDays, trialDays, stripeMonthlyPriceId, stripeAnnualPriceId, isActive, isRecommended, sortOrder } = req.body;
    const plan = await prisma.plan.create({
      data: {
        name, slug, description, monthlyPrice, annualPrice, currency, durationDays, trialDays, stripeMonthlyPriceId, stripeAnnualPriceId, isActive, sortOrder
      }
    });
    await logAdminAction(req, 'Create Plan', null, null, JSON.stringify(plan));
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

plansRouter.put('/:id', async (req, res) => {
  try {
    const oldPlan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    const { name, slug, description, monthlyPrice, annualPrice, currency, durationDays, trialDays, stripeMonthlyPriceId, stripeAnnualPriceId, isActive, isRecommended, sortOrder } = req.body;
    let finalMonthlyPriceId = stripeMonthlyPriceId;
    let finalAnnualPriceId = stripeAnnualPriceId;

    if (oldPlan) {
      if (oldPlan.monthlyPrice !== monthlyPrice) {
        finalMonthlyPriceId = null;
      }
      if (oldPlan.annualPrice !== annualPrice) {
        finalAnnualPriceId = null;
      }
    }

    const plan = await prisma.plan.update({
      where: { id: req.params.id },
      data: {
        name, slug, description, monthlyPrice, annualPrice, currency, durationDays, trialDays, 
        stripeMonthlyPriceId: finalMonthlyPriceId, 
        stripeAnnualPriceId: finalAnnualPriceId, 
        isActive, sortOrder
      }
    });

    if (oldPlan && oldPlan.slug !== slug) {
       await prisma.user.updateMany({
         where: { plan: oldPlan.slug },
         data: { plan: slug }
       });
    }

    await logAdminAction(req, 'Update Plan', null, JSON.stringify(oldPlan), JSON.stringify(plan));
    res.json({ plan });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

plansRouter.delete('/:id', async (req, res) => {
  try {
    const plan = await prisma.plan.findUnique({ where: { id: req.params.id } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    // In our system user.plan is currently a string like "Free", "Pro", "Annual"
    // Check if anyone is using it
    const usersCount = await prisma.user.count({ 
      where: { 
        OR: [
          { plan: plan.slug },
          { plan: plan.name }
        ]
      } 
    });
    if (usersCount > 0) return res.status(400).json({ error: 'Cannot delete plan with active users' });

    await prisma.plan.delete({ where: { id: req.params.id } });
    await logAdminAction(req, 'Delete Plan', null, JSON.stringify(plan), null);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// Manage Plan Features
plansRouter.post('/:id/features', async (req, res) => {
  try {
    const { featureId, enabled } = req.body;
    const planId = req.params.id;

    const planFeature = await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId,
          featureId
        }
      },
      update: { enabled },
      create: { planId, featureId, enabled }
    });

    await logAdminAction(req, 'Toggle Plan Feature', null, null, `Plan: ${planId}, Feature: ${featureId}, Enabled: ${enabled}`);

    res.json({ planFeature });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign feature' });
  }
});

export default plansRouter;

