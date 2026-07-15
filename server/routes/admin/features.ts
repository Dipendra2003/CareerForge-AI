import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';

const featuresRouter = Router();

featuresRouter.get('/', async (req, res) => {
  try {
    const features = await prisma.feature.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        plans: {
          include: { plan: true }
        }
      }
    });
    res.json({ features });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

featuresRouter.post('/', async (req, res) => {
  try {
    const { name, key, description, category, isActive, assignedPlans } = req.body;
    
    // Check duplicate key
    const existing = await prisma.feature.findUnique({ where: { key } });
    if (existing) return res.status(400).json({ error: 'Feature key already exists' });

    const feature = await prisma.feature.create({
      data: { name, key, description, category, isActive }
    });

    if (assignedPlans && Array.isArray(assignedPlans)) {
      for (const p of assignedPlans) {
        if (p.enabled) {
          await prisma.planFeature.create({
            data: { planId: p.planId, featureId: feature.id, enabled: true }
          });
        }
      }
    }

    await logAdminAction(req, 'Create Feature', null, null, JSON.stringify(feature));

    res.json({ feature });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

featuresRouter.put('/:id', async (req, res) => {
  try {
    const oldFeature = await prisma.feature.findUnique({ where: { id: req.params.id } });
    const { name, key, description, category, isActive, assignedPlans } = req.body;
    const feature = await prisma.feature.update({
      where: { id: req.params.id },
      data: { name, key, description, category, isActive }
    });

    if (assignedPlans && Array.isArray(assignedPlans)) {
      for (const p of assignedPlans) {
        const existing = await prisma.planFeature.findUnique({
          where: { planId_featureId: { planId: p.planId, featureId: feature.id } }
        });
        
        if (existing) {
          await prisma.planFeature.update({
            where: { id: existing.id },
            data: { enabled: p.enabled }
          });
        } else if (p.enabled) {
          await prisma.planFeature.create({
            data: { planId: p.planId, featureId: feature.id, enabled: true }
          });
        }
      }
    }

    await logAdminAction(req, 'Update Feature', null, JSON.stringify(oldFeature), JSON.stringify(feature));

    res.json({ feature });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

featuresRouter.delete('/:id', async (req, res) => {
  try {
    const feature = await prisma.feature.findUnique({ where: { id: req.params.id } });
    await prisma.feature.delete({ where: { id: req.params.id } });
    
    await logAdminAction(req, 'Delete Feature', null, JSON.stringify(feature), null);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

export default featuresRouter;

