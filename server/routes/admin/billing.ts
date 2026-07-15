import { Router } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, requireAdmin } from "../../middleware/auth";
import { getStripe } from "../stripe";
import { sendTemplateEmail } from "../../services/email/emailService";

const router = Router();
router.use(requireAuth, requireAdmin);

// Dashboard Stats
router.get("/stats", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    const [
      invoicesToday,
      invoicesMonth,
      invoicesYear,
      allInvoices,
      totalRefunds,
      pendingRefunds,
      usedCoupons,
      activeTrials
    ] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: today }, paymentStatus: 'paid' }
      }),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: firstDayOfMonth }, paymentStatus: 'paid' }
      }),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { createdAt: { gte: firstDayOfYear }, paymentStatus: 'paid' }
      }),
      prisma.invoice.aggregate({
        _sum: { total: true },
        where: { paymentStatus: 'paid' }
      }),
      prisma.refund.aggregate({
        _sum: { amount: true },
        where: { status: 'approved' }
      }),
      prisma.refund.count({ where: { status: 'pending' } }),
      prisma.coupon.aggregate({ _sum: { usedCount: true } }),
      prisma.user.count({ where: { plan: { equals: 'trial', mode: 'insensitive' } } })
    ]);

    let mrr = 0;
    let arr = 0;
    let churnRate = 0;
    let ltv = 0;
    let arpu = 0;
    
    try {
        let cache = await prisma.financialAnalyticsCache.findUnique({ where: { id: 'current' } });
        if (cache) {
            mrr = cache.mrr;
            arr = cache.arr;
            churnRate = cache.churnRate;
            ltv = cache.ltv;
            arpu = cache.arpu;
        } else {
            // Background sync if missing
            import('../../lib/cron').then(cronLib => cronLib.runStripeReconciliation()).catch(() => {});
        }
    } catch (e) {
        console.error("Failed to read financial cache", e);
    }

    res.json({
      mrr,
      arr,
      churnRate,
      ltv,
      arpu,
      todayRevenue: invoicesToday._sum.total || 0,
      monthlyRevenue: invoicesMonth._sum.total || 0,
      yearlyRevenue: invoicesYear._sum.total || 0,
      refundsTotal: totalRefunds._sum.amount || 0,
      pendingRefunds,
      couponsUsed: usedCoupons._sum.usedCount || 0,
      trialsActive: activeTrials,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/migrate-users", async (req, res) => {
  try {
    const { fromPlan, toPlan } = req.body;
    if (!fromPlan || !toPlan) return res.status(400).json({ error: "Missing fromPlan or toPlan" });
    
    const users = await prisma.user.findMany({ where: { plan: fromPlan } });
    await prisma.user.updateMany({
       where: { plan: fromPlan },
       data: { plan: toPlan }
    });
    
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "MIGRATE_USERS", description: `Migrated ${users.length} users from ${fromPlan} to ${toPlan}` }
    });
    
    res.json({ success: true, count: users.length });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Coupons ---

router.get("/coupons", async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/coupons", async (req, res) => {
  try {
    const data = req.body;
    
    // Strict Validation
    const discountValue = Number(data.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) return res.status(400).json({ error: "Invalid discount value" });
    if (data.discountType === 'percent' && discountValue > 100) return res.status(400).json({ error: "Percentage discount cannot exceed 100" });
    
    const validFrom = data.validFrom ? new Date(data.validFrom) : null;
    const validUntil = data.validUntil ? new Date(data.validUntil) : null;
    
    if (validFrom && isNaN(validFrom.getTime())) return res.status(400).json({ error: "Invalid start date" });
    if (validUntil && isNaN(validUntil.getTime())) return res.status(400).json({ error: "Invalid end date" });
    if (validFrom && validUntil && validFrom > validUntil) return res.status(400).json({ error: "Start date must be before end date" });
    
    const durationInMonths = data.durationInMonths ? Number(data.durationInMonths) : null;
    if (data.duration === 'repeating' && (!durationInMonths || durationInMonths <= 0)) {
        return res.status(400).json({ error: "Repeating duration requires positive months" });
    }

    const coupon = await (prisma as any).coupon.create({
      data: {
        code: data.code,
        title: data.title,
        description: data.description,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        duration: data.duration || "once",
        durationInMonths: data.durationInMonths ? Number(data.durationInMonths) : null,
        minimumPurchase: data.minimumPurchase ? Number(data.minimumPurchase) : null,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
        firstPurchaseOnly: !!data.firstPurchaseOnly,
        isMonthlyOnly: !!data.isMonthlyOnly,
        isAnnualOnly: !!data.isAnnualOnly,
        stackable: !!data.stackable,
        applicablePlans: data.applicablePlans || [],
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        createdBy: req.user!.id,
      }
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "CREATE_COUPON", description: `Created coupon ${coupon.code}` }
    });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/coupons/:id", async (req, res) => {
  try {
    const data = req.body;
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data: {
        ...data,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      }
    });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/coupons/:id", async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "DELETE_COUPON", description: `Deleted coupon ${req.params.id}` }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Promotions ---

router.get("/promotions", async (req, res) => {
  try {
    const promos = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
    res.json(promos);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/promotions", async (req, res) => {
  try {
    const data = req.body;
    
    const startDate = data.startDate ? new Date(data.startDate) : null;
    const endDate = data.endDate ? new Date(data.endDate) : null;
    
    if (startDate && isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid start date" });
    if (endDate && isNaN(endDate.getTime())) return res.status(400).json({ error: "Invalid end date" });
    if (startDate && endDate && startDate > endDate) return res.status(400).json({ error: "Start date must be before end date" });

    const promo = await prisma.promotion.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "CREATE_PROMOTION", description: `Created promo ${promo.title}` }
    });
    res.json(promo);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/promotions/:id", async (req, res) => {
  try {
    const data = req.body;
    const promo = await prisma.promotion.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      }
    });
    res.json(promo);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/promotions/:id", async (req, res) => {
  try {
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Trials ---

router.get("/trials", async (req, res) => {
  try {
    const trials = await prisma.trialPlan.findMany();
    res.json(trials);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/trials", async (req, res) => {
  try {
    // Array of { planId, days, enabled }
    const trials = req.body;
    
    for (const t of trials) {
        const days = Number(t.days);
        if (isNaN(days) || days < 1 || days > 730) {
            return res.status(400).json({ error: "Trial days must be between 1 and 730" });
        }
    }
    
    await Promise.all(trials.map((t: any) => 
      prisma.trialPlan.upsert({
        where: { planId: t.planId },
        update: { days: Number(t.days), enabled: t.enabled },
        create: { planId: t.planId, days: Number(t.days), enabled: t.enabled }
      })
    ));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Invoices & Refunds ---

router.get("/invoices", async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/refunds", async (req, res) => {
  try {
    const refunds = await prisma.refund.findMany({ orderBy: { createdAt: "desc" } });
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/refunds/:id/approve", async (req, res) => {
  try {
    const { cancelSubscription, revokeAccess } = req.body;

    // Lock refund to prevent double processing
    const existingRefund = await prisma.refund.findUnique({ where: { id: req.params.id } });
    if (!existingRefund || existingRefund.status !== 'pending') {
        return res.status(400).json({ error: "Refund is not pending or does not exist" });
    }

    const refund = await prisma.refund.update({
      where: { id: req.params.id },
      data: { status: "processing", approvedBy: req.user!.id }
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id: refund.invoiceId }
    });
    
    if (invoice && invoice.stripeInvoiceId) {
      try {
        const stripe = getStripe();
        const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId) as any;
        if (stripeInvoice.payment_intent) {
          await stripe.refunds.create({
            payment_intent: stripeInvoice.payment_intent as string,
            amount: Math.round(refund.amount * 100) 
          }, {
            idempotencyKey: `refund_${refund.id}`
          });
        }
        if (cancelSubscription && stripeInvoice.subscription) {
            await stripe.subscriptions.cancel(stripeInvoice.subscription as string, undefined, {
               idempotencyKey: `cancel_${refund.id}`
            });
        }
      } catch(stripeError: any) {
        console.error("Stripe refund error", stripeError);
      }
    }

    await prisma.invoice.update({
      where: { id: refund.invoiceId },
      data: { paymentStatus: "refunded" }
    });
    
    await prisma.refund.update({
      where: { id: refund.id },
      data: { status: "approved" }
    });
    
    if (invoice && invoice.userId && revokeAccess) {
        await prisma.user.update({
            where: { id: invoice.userId },
            data: { plan: "free", subscriptionId: null, subscriptionEnd: null }
        });
        await prisma.billingHistory.create({
            data: { userId: invoice.userId, action: "cancelled", source: "admin_refund" }
        });
    }
    
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "APPROVE_REFUND", description: `Approved refund ${req.params.id}` }
    });

    if (invoice && invoice.userId) {
      const user = await prisma.user.findUnique({ where: { id: invoice.userId } });
      if (user && user.email) {
        await sendTemplateEmail('refund_approved', user.email, {
          amount: refund.amount.toFixed(2),
          invoiceId: refund.invoiceId || '',
          name: user.name || 'User'
        });
      }
    }

    res.json(refund);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/refunds/:id/reject", async (req, res) => {
  try {
    const refund = await prisma.refund.update({
      where: { id: req.params.id },
      data: { status: "rejected" }
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, actorEmail: req.user!.email, module: "BILLING", action: "REJECT_REFUND", description: `Rejected refund ${req.params.id}` }
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id: refund.invoiceId }
    });

    if (invoice && invoice.userId) {
      const user = await prisma.user.findUnique({ where: { id: invoice.userId } });
      if (user && user.email) {
        await sendTemplateEmail('refund_rejected', user.email, {
          amount: refund.amount.toFixed(2),
          invoiceId: refund.invoiceId || '',
          name: user.name || 'User'
        });
      }
    }

    res.json(refund);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
