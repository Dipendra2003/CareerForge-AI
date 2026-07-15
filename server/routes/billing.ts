import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/promotions", async (req, res) => {
  try {
    const today = new Date();
    const activePromos = await prisma.promotion.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: today } }
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: today } }
            ]
          }
        ]
      }
    });
    res.json(activePromos);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.use(requireAuth);

router.get("/history", async (req, res) => {
  try {
    const history = await prisma.billingHistory.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/invoices", async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/validate-coupon", async (req, res) => {
  try {
    const { code, planId } = req.body;
    const coupon = await prisma.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.isActive) {
      return res.status(400).json({ error: "Invalid or inactive coupon code." });
    }
    
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: "Coupon usage limit reached." });
    }

    if (coupon.validFrom && new Date() < coupon.validFrom) {
      return res.status(400).json({ error: "Coupon is not yet valid." });
    }

    if (coupon.validUntil && new Date() > coupon.validUntil) {
      return res.status(400).json({ error: "Coupon has expired." });
    }

    if (coupon.applicablePlans.length > 0 && planId && !coupon.applicablePlans.includes(planId)) {
      return res.status(400).json({ error: "Coupon is not applicable to this plan." });
    }

    res.json(coupon);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
