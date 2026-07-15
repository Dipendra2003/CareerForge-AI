import { Router } from 'express';
import prisma from '../../lib/prisma';

const auditRouter = Router();

auditRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const { search, module, action, actorId, targetUserId, status, from, to } = req.query;

    let where: any = {};

    if (search) {
      where.OR = [
        { actorName: { contains: search as string, mode: 'insensitive' } },
        { actorEmail: { contains: search as string, mode: 'insensitive' } },
        { action: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (module) where.module = module;
    if (action) where.action = action;
    if (actorId) where.actorId = actorId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (status) where.status = status;

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const endDate = new Date(to as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, email: true, name: true } },
          targetUser: { select: { id: true, email: true, name: true } }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Endpoint to fetch modules and actions for filters
auditRouter.get('/filters', async (req, res) => {
  try {
    const [modules, actions] = await Promise.all([
      prisma.auditLog.findMany({
        select: { module: true },
        distinct: ['module'],
        where: { module: { not: null } }
      }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ['action']
      })
    ]);

    res.json({
      modules: modules.map(m => m.module),
      actions: actions.map(a => a.action)
    });
  } catch (error) {
    console.error('Failed to fetch filters:', error);
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
});

export default auditRouter;

