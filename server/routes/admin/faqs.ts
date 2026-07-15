import { Router } from 'express';
import prisma from '../../lib/prisma';
import { logAdminAction } from '../../utils/auditLogger';

const router = Router();

// GET all FAQ Categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.fAQCategory.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching FAQ categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST new FAQ Category
router.post('/categories', async (req, res) => {
  try {
    const { name, slug, description, displayOrder } = req.body;
    
    const existing = await prisma.fAQCategory.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug must be unique' });
    }

    const category = await prisma.fAQCategory.create({
      data: { name, slug, description, displayOrder: displayOrder || 0 }
    });

    res.json(category);
  } catch (error) {
    console.error('Error creating FAQ category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT update FAQ Category
router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, displayOrder } = req.body;

    const existing = await prisma.fAQCategory.findFirst({ where: { slug, NOT: { id } } });
    if (existing) {
      return res.status(400).json({ error: 'Slug must be unique' });
    }

    const category = await prisma.fAQCategory.update({
      where: { id },
      data: { name, slug, description, displayOrder }
    });

    res.json(category);
  } catch (error) {
    console.error('Error updating FAQ category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE FAQ Category
router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fAQCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// GET all FAQs
router.get('/', async (req, res) => {
  try {
    const { search, categoryId, isPublished, isFeatured, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { question: { contains: String(search), mode: 'insensitive' } },
        { answer: { contains: String(search), mode: 'insensitive' } }
      ];
    }
    if (categoryId) where.categoryId = String(categoryId);
    if (isPublished !== undefined && isPublished !== '') where.isPublished = isPublished === 'true';
    if (isFeatured !== undefined && isFeatured !== '') where.isFeatured = isFeatured === 'true';

    const [faqs, total] = await Promise.all([
      prisma.fAQ.findMany({
        where,
        include: { category: true },
        orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.fAQ.count({ where })
    ]);

    res.json({ faqs, total, pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({ error: 'Failed to fetch FAQs' });
  }
});

// GET single FAQ
router.get('/:id', async (req, res) => {
  try {
    const faq = await prisma.fAQ.findUnique({
      where: { id: req.params.id },
      include: { category: true }
    });
    if (!faq) return res.status(404).json({ error: 'FAQ not found' });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch FAQ' });
  }
});

// POST new FAQ
router.post('/', async (req, res) => {
  try {
    const { question, answer, slug, categoryId, displayOrder, isPublished, isFeatured } = req.body;

    if (!question || !answer || !slug) {
      return res.status(400).json({ error: 'Question, answer, and slug are required' });
    }

    const existing = await prisma.fAQ.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ error: 'Slug must be unique' });
    }

    const faq = await prisma.fAQ.create({
      data: {
        question,
        answer,
        slug,
        categoryId: categoryId || null,
        displayOrder: displayOrder || 0,
        isPublished: isPublished || false,
        isFeatured: isFeatured || false,
        createdBy: (req as any).user.id,
        updatedBy: (req as any).user.id,
      },
      include: { category: true }
    });

    await logAdminAction(req, 'FAQ Created', faq.id, null, faq.question);
    res.json(faq);
  } catch (error) {
    console.error('Error creating FAQ:', error);
    res.status(500).json({ error: 'Failed to create FAQ' });
  }
});

// PUT update FAQ
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, slug, categoryId, displayOrder, isPublished, isFeatured } = req.body;

    if (!question || !answer || !slug) {
      return res.status(400).json({ error: 'Question, answer, and slug are required' });
    }

    const existing = await prisma.fAQ.findFirst({ where: { slug, NOT: { id } } });
    if (existing) {
      return res.status(400).json({ error: 'Slug must be unique' });
    }

    const oldFaq = await prisma.fAQ.findUnique({ where: { id } });

    const faq = await prisma.fAQ.update({
      where: { id },
      data: {
        question,
        answer,
        slug,
        categoryId: categoryId || null,
        displayOrder: displayOrder !== undefined ? displayOrder : oldFaq?.displayOrder,
        isPublished: isPublished !== undefined ? isPublished : oldFaq?.isPublished,
        isFeatured: isFeatured !== undefined ? isFeatured : oldFaq?.isFeatured,
        updatedBy: (req as any).user.id,
      },
      include: { category: true }
    });

    if (oldFaq?.isPublished !== faq.isPublished) {
       await logAdminAction(req, faq.isPublished ? 'FAQ Published' : 'FAQ Unpublished', faq.id, null, faq.question);
    } else {
       await logAdminAction(req, 'FAQ Updated', faq.id, null, faq.question);
    }
    
    res.json(faq);
  } catch (error) {
    console.error('Error updating FAQ:', error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// DELETE FAQ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const faq = await prisma.fAQ.delete({ where: { id } });
    await logAdminAction(req, 'FAQ Deleted', id, JSON.stringify(faq), faq.question);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting FAQ:', error);
    res.status(500).json({ error: 'Failed to delete FAQ' });
  }
});

// POST reorder FAQs
router.post('/reorder', async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, displayOrder }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }

    for (const item of items) {
      await prisma.fAQ.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder }
      });
    }

    await logAdminAction(req, 'FAQ Reordered', null, null, `Count: ${items.length}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering FAQs:', error);
    res.status(500).json({ error: 'Failed to reorder FAQs' });
  }
});

export default router;