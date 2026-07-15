import { Router } from "express";
import Stripe from "stripe";
import { NotificationService } from "../services/notification/NotificationService";
import { NotificationType } from "../types/notification";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import express from "express";
import { posthog } from "../services/posthogLoader";
import { sendTemplateEmail } from "../services/email/emailService";
import { logActivity } from "../utils/auditLogger";

export const stripeRouter = Router();

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === "production") {
    console.warn("⚠️ STRIPE_SECRET_KEY is missing. Billing features will not function.");
}

let stripeClient: Stripe | null = null;
export const getStripe = () => {
    if (!stripeClient) {
        if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is missing");
        stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
            apiVersion: "2025-02-24.acacia" as any,
        });
    }
    return stripeClient;
}

// Helper to dynamically get or create a real Stripe Product and Price
async function getOrCreateRealStripePrice(planRecord: any, billingPeriod: string): Promise<string> {
    const stripe = getStripe();
    const isMonthly = billingPeriod === 'monthly';
    const priceAmount = isMonthly ? planRecord.monthlyPrice : planRecord.annualPrice;
    const interval = isMonthly ? "month" : "year";
    
    const productName = `CareerForge AI - ${planRecord.name} (${isMonthly ? 'Monthly' : 'Annual'})`;
    
    let product;
    try {
        const products = await stripe.products.list({ limit: 100 });
        product = products.data.find((p: any) => p.name === productName && p.active);
    } catch (e) {
        console.warn("Failed to list products, attempting creation...", e);
    }

    if (!product) {
        product = await stripe.products.create({
            name: productName,
            description: planRecord.description || `${planRecord.name} subscription plan`,
        });
    }

    let price;
    try {
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
        price = prices.data.find((p: any) => p.unit_amount === Math.round(priceAmount * 100) && p.recurring?.interval === interval);
    } catch (e) {
        console.warn("Failed to list prices, attempting creation...", e);
    }

    if (!price) {
        price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(priceAmount * 100), // in cents
            currency: planRecord.currency?.toLowerCase() || "usd",
            recurring: {
                interval: interval as any,
            },
        });
    }

    // Save the price ID back to local database for optimization
    const updateData: any = {};
    if (isMonthly) {
        updateData.stripeMonthlyPriceId = price.id;
    } else {
        updateData.stripeAnnualPriceId = price.id;
    }
    await prisma.plan.update({
        where: { id: planRecord.id },
        data: updateData,
    });

    return price.id;
}

// Helper to dynamically check or create a Stripe coupon
async function getOrCreateStripeCoupon(couponRecord: any): Promise<string | null> {
    const stripe = getStripe();
    try {
        const stripeCoupon = await stripe.coupons.retrieve(couponRecord.code);
        return stripeCoupon.id;
    } catch (err: any) {
        if (err.statusCode === 404 || err.message?.includes("No such coupon")) {
            try {
                const amountOff = couponRecord.discountType === 'fixed' ? Math.round(couponRecord.discountValue * 100) : undefined;
                const percentOff = couponRecord.discountType === 'percentage' ? couponRecord.discountValue : undefined;
                
                const createdCoupon = await stripe.coupons.create({
                    id: couponRecord.code,
                    name: couponRecord.title || couponRecord.code,
                    amount_off: amountOff,
                    percent_off: percentOff,
                    currency: amountOff ? "usd" : undefined,
                    duration: (couponRecord.duration as Stripe.CouponCreateParams.Duration) || "once",
                    duration_in_months: couponRecord.duration === 'repeating' ? (couponRecord.durationInMonths || undefined) : undefined,
                    max_redemptions: couponRecord.usageLimit || couponRecord.maxUses || undefined,
                });
                return createdCoupon.id;
            } catch (createErr) {
                console.error("Failed to create coupon in Stripe:", createErr);
                return null;
            }
        }
        console.error("Failed to retrieve coupon from Stripe:", err);
        return null;
    }
}

// 1. Checkout Session
stripeRouter.post("/checkout", requireAuth, express.json(), async (req: any, res) => {
    try {
        const stripe = getStripe();
        const { plan, couponCode } = req.body; // Actually plan is slug now
        
        const planRecord = await prisma.plan.findUnique({ where: { slug: plan } });
        if (!planRecord) return res.status(400).json({ error: "Invalid plan" });

        const billingPeriod = req.body.billingPeriod || 'monthly';
        let priceId = billingPeriod === 'monthly' ? planRecord.stripeMonthlyPriceId : planRecord.stripeAnnualPriceId;
        
        // If priceId doesn't exist or is a mock ID, automatically create a real product/price in their Stripe account
        const isMockPrice = !priceId || priceId.startsWith("price_mock_");
        if (isMockPrice) {
            try {
                priceId = await getOrCreateRealStripePrice(planRecord, billingPeriod);
            } catch (createErr: any) {
                console.error("Failed to dynamically generate real Stripe Price ID:", createErr);
                return res.status(400).json({ error: `Price configuration failed: ${createErr.message}` });
            }
        }

        const origin = req.headers.origin || process.env.PUBLIC_URL;

        const user = await prisma.user.findUnique({
             where: { id: req.user.id },
             select: { stripeCustomerId: true, email: true, subscriptionId: true, hasHadTrial: true } as any
        });
        
        let customerId = user?.stripeCustomerId;
        
        // Prevent concurrent checkout sessions if they already have an active subscription
        if (user?.subscriptionId) {
            try {
                const existingSub = await stripe.subscriptions.retrieve(user.subscriptionId as any as string);
                if (existingSub.status === 'active' || existingSub.status === 'trialing') {
                    return res.status(400).json({ error: "You already have an active subscription. Please manage it via the customer portal." });
                }
            } catch (e) {
                // Ignore if subscription no longer exists in Stripe
            }
        }

        let discounts = [];
        let couponRecord = null;
        if (couponCode) {
            couponRecord = await prisma.coupon.findUnique({ where: { code: couponCode } });
            if (couponRecord && couponRecord.isActive) {
                let isValid = true;
                if (couponRecord.firstPurchaseOnly && (user as any)?.hasHadTrial) {
                    isValid = false;
                }
                if (couponRecord.isMonthlyOnly && billingPeriod !== 'monthly') {
                    isValid = false;
                }
                if (couponRecord.isAnnualOnly && billingPeriod === 'monthly') {
                    isValid = false;
                }
                if (couponRecord.applicablePlans && couponRecord.applicablePlans.length > 0) {
                    if (!couponRecord.applicablePlans.includes(planRecord.id) && !couponRecord.applicablePlans.includes(planRecord.slug)) {
                        isValid = false;
                    }
                }
                
                if (isValid) {
                    const realCouponId = await getOrCreateStripeCoupon(couponRecord);
                    if (realCouponId) {
                        discounts.push({ coupon: realCouponId });
                    }
                } else {
                    return res.status(400).json({ error: "Coupon is not applicable to this order." });
                }
            }
        }

        const trialPlan = await prisma.trialPlan.findUnique({ where: { planId: plan } });
        let subscription_data: any = {};
        if (trialPlan && trialPlan.enabled && trialPlan.days > 0 && !(user as any)?.hasHadTrial) {
            subscription_data.trial_period_days = trialPlan.days;
        }

        let session;
        const systemSettings = await prisma.systemSetting.findFirst();
        const enableAutomaticTax = (systemSettings as any)?.enableAutomaticTax || false;
        
        try {
            session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                customer: (customerId as any) || undefined,
                customer_email: customerId ? undefined : (user?.email as any),
                line_items: [
                    {
                        price: priceId,
                        quantity: 1,
                    },
                ],
                discounts: discounts.length > 0 ? discounts : undefined,
                subscription_data: Object.keys(subscription_data).length > 0 ? subscription_data : undefined,
                client_reference_id: req.user.id,
                success_url: `${origin}/dashboard?checkout=success`,
                cancel_url: `${origin}/dashboard?checkout=cancel`,
                automatic_tax: enableAutomaticTax ? { enabled: true } : undefined,
                metadata: {
                    userId: req.user.id,
                    plan: plan,
                    couponApplied: couponCode || ''
                }
            });
        } catch (sessionErr: any) {
            // Check if error is related to price or resource missing in Stripe
            if (sessionErr.message?.includes("No such price") || sessionErr.message?.includes("resource_missing") || sessionErr.statusCode === 400) {
                console.log("Stripe price invalid or missing, attempting dynamic repair & retry...");
                try {
                    priceId = await getOrCreateRealStripePrice(planRecord, billingPeriod);
                    session = await stripe.checkout.sessions.create({
                        payment_method_types: ["card"],
                        mode: "subscription",
                        customer: (customerId as any) || undefined,
                        customer_email: customerId ? undefined : (user?.email as any),
                        line_items: [
                            {
                                price: priceId,
                                quantity: 1,
                            },
                        ],
                        discounts: discounts.length > 0 ? discounts : undefined,
                        subscription_data: Object.keys(subscription_data).length > 0 ? subscription_data : undefined,
                        client_reference_id: req.user.id,
                        success_url: `${origin}/dashboard?checkout=success`,
                        cancel_url: `${origin}/dashboard?checkout=cancel`,
                        automatic_tax: enableAutomaticTax ? { enabled: true } : undefined,
                        metadata: {
                            userId: req.user.id,
                            plan: plan,
                            couponApplied: couponCode || ''
                        }
                    });
                } catch (retryErr: any) {
                    throw new Error(`Checkout retry failed: ${retryErr.message}`);
                }
            } else {
                throw sessionErr;
            }
        }

        res.json({ url: session.url });
    } catch (err: any) {
        console.error("Stripe Checkout Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Customer Portal
stripeRouter.post("/customer-portal", requireAuth, express.json(), async (req: any, res) => {
    try {
        const stripe = getStripe();
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { stripeCustomerId: true, subscriptionId: true, plan: true }
        });
        
        if (!user || !user.stripeCustomerId || (!user.subscriptionId && user.plan.toLowerCase() === 'free')) {
            // If they don't have a stripe customer ID but are somehow on a paid plan (e.g. admin granted), just downgrade them directly
            if (user && user.plan.toLowerCase() !== 'free') {
                await prisma.user.update({
                    where: { id: req.user.id },
                    data: { plan: 'free' }
                });
                return res.json({ success: true, downgradedDirectly: true });
            }
            return res.status(403).json({ error: "Only active subscribers can access the billing portal" });
        }

        const origin = req.headers.origin || process.env.PUBLIC_URL;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${origin}/account`,
        });

        res.json({ url: portalSession.url });
    } catch (err: any) {
        console.error("Stripe Portal Error:", err);
        res.status(500).json({ error: err.message });
    }
});

export const stripeWebhookRouter = Router();
// Stripe Webhook uses raw body
stripeWebhookRouter.post("/webhook", express.raw({ type: "application/json" }), async (req: any, res) => {
    try {
        const stripe = getStripe();
        const signature = req.headers["stripe-signature"];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        if (!webhookSecret) {
            console.error("⚠️  STRIPE_WEBHOOK_SECRET is not configured.");
            return res.status(500).send("Webhook configuration error.");
        }

        try {
            event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
        } catch (err: any) {
            console.error("⚠️  Webhook signature verification failed:", err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (process.env.NODE_ENV === "production" && !event.livemode) {
            console.warn("⚠️  Ignoring test mode webhook event in production.");
            return res.json({ received: true });
        }

        try {
            const processed = await (prisma as any).processedWebhook.findUnique({ where: { eventId: event.id } });
            if (processed) {
                console.log(`[Webhook] Duplicate event ${event.id} received. Ignoring.`);
                return res.json({ received: true, duplicate: true });
            }
            await (prisma as any).processedWebhook.create({ data: { eventId: event.id } });
        } catch (e: any) {
            // Handle race condition where two webhooks hit this block concurrently
            if (e.code === 'P2002') {
                console.log(`[Webhook] Concurrent duplicate event ${event.id} intercepted. Ignoring.`);
                return res.json({ received: true, duplicate: true });
            }
            console.error("Error tracking webhook idempotency:", e);
        }

        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id || session.metadata?.userId;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;
                
                if (userId && subscriptionId) {
                    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                    
                    // Out-of-order webhook protection
                    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
                        console.warn(`[Webhook] checkout.session.completed received but subscription ${subscriptionId} is ${subscription.status}. Ignoring upgrade.`);
                        break;
                    }
                    
                    const priceId = subscription.items.data[0]?.price.id;
                    const dbPlan = await prisma.plan.findFirst({
                        where: { OR: [{ stripeMonthlyPriceId: priceId }, { stripeAnnualPriceId: priceId }] }
                    });
                    
                    if (!dbPlan) {
                        console.error(`[Webhook CRITICAL] Checkout complete for user ${userId}, but Stripe Price ID ${priceId} does not match any local Plan! Upgrade aborted.`);
                        await prisma.auditLog.create({
                            data: {
                                actorId: 'system',
                                actorName: 'Stripe Webhook',
                                targetUserId: userId,
                                action: 'Subscription Failed',
                                module: 'Billing',
                                description: `Failed to map Stripe Price ID ${priceId} to a local Plan.`
                            }
                        });
                        break;
                    }
                    
                    const planType = dbPlan.slug;

                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            stripeCustomerId: customerId,
                            subscriptionId: subscriptionId,
                            plan: planType,
                            subscriptionEnd: new Date((subscription as any).current_period_end * 1000),
                            scansUsedThisMonth: 0, // Reset quotas on upgrade
                            hasHadTrial: subscription.status === 'trialing' ? true : undefined
                        } as any
                    });
                    
                    await prisma.billingHistory.create({
                        data: {
                            userId: userId,
                            action: 'upgraded',
                            newPlan: planType,
                            source: 'stripe'
                        }
                    });
                    
                    const userRaw = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
                    
                    await logActivity({
                        req,
                        actorId: 'system',
                        actorName: 'Stripe Webhook',
                        targetUserId: userId,
                        targetType: 'User',
                        targetId: userId,
                        action: 'Subscription Created',
                        module: 'Stripe',
                        description: `Plan: ${planType}, SubID: ${subscriptionId}`
                    });

                    if (userRaw?.email) {
                        await sendTemplateEmail('subscription_success', userRaw.email, {
                            planName: planType,
                            name: userRaw.name || 'User'
                        });

                        await NotificationService.sendBilling(
                          userId,
                          "Subscription Upgraded",
                          `Your account has been successfully upgraded to the ${planType.toUpperCase()} plan!`,
                          NotificationType.SUCCESS
                        );
                    }
                    
                    const couponApplied = session.metadata?.couponApplied;
                    if (couponApplied) {
                        try {
                            await prisma.coupon.update({
                                where: { code: couponApplied },
                                data: { usedCount: { increment: 1 } }
                            });
                            if (userRaw?.email) {
                                await sendTemplateEmail('coupon_applied', userRaw.email, {
                                    name: userRaw.name || 'User',
                                    couponCode: couponApplied
                                });
                                await NotificationService.sendBilling(
                                  userId,
                                  "Coupon Applied",
                                  `Coupon ${couponApplied} was successfully applied to your order.`,
                                  NotificationType.SUCCESS
                                );
                            }
                        } catch(e) {}
                    }
                    
                    if (posthog) {
                        posthog.capture({
                            distinctId: userId,
                            event: 'Upgrade',
                            properties: {
                                plan: planType,
                                amount: session.amount_total
                            }
                        });
                    }
                }
                break;
            }
            case "checkout.session.expired": {
                // We just ignore or log expired checkouts for now
                console.log("Checkout session expired:", event.data.object.id);
                break;
            }
            case "customer.subscription.updated": {
                const subscription = event.data.object as Stripe.Subscription;
                const endDate = new Date((subscription as any).current_period_end * 1000);
                const priceId = subscription.items.data[0]?.price.id || (subscription as any).plan?.id;
                
                const dbPlan = await prisma.plan.findFirst({
                   where: { OR: [{ stripeMonthlyPriceId: priceId }, { stripeAnnualPriceId: priceId }] }
                });
                
                const users = await prisma.user.findMany({ where: { subscriptionId: subscription.id } });
                const user = users.length > 0 ? users[0] : null;

                if (subscription.status === "active" || subscription.status === "trialing") {
                     const updateData: any = { subscriptionEnd: endDate };
                     
                     if (dbPlan) {
                         if (user && user.plan !== dbPlan.slug) {
                             updateData.plan = dbPlan.slug;
                             updateData.scansUsedThisMonth = 0; // reset on tier change
                         }
                     } else {
                         console.error(`[Webhook] No local plan found for price ${priceId} (Sub: ${subscription.id}). Ignoring plan upgrade/tier change.`);
                     }

                     await prisma.user.updateMany({
                        where: { subscriptionId: subscription.id },
                        data: updateData
                     });
                     
                     if (user) {
                         if (dbPlan && user.plan !== dbPlan.slug) {
                             await prisma.billingHistory.create({
                                 data: {
                                     userId: user.id,
                                     action: 'upgraded',
                                     previousPlan: user.plan,
                                     newPlan: dbPlan.slug,
                                     source: 'stripe'
                                 }
                             });
                         }
                         await logActivity({
                             req,
                             actorId: 'system',
                             actorName: 'Stripe Webhook',
                             targetUserId: user.id,
                             action: 'Billing Change',
                             module: 'Stripe',
                             description: `Subscription ${subscription.id} updated`
                         });

                         if (subscription.status === "trialing" && user.email) {
                             await prisma.billingHistory.create({
                                 data: {
                                     userId: user.id,
                                     action: 'trial_started',
                                     source: 'stripe'
                                 }
                             });
                             await sendTemplateEmail('trial_started', user.email, {
                                 name: user.name || 'User',
                                 endDate: endDate.toLocaleDateString()
                             });
                             await NotificationService.sendBilling(
                               user.id,
                               "Trial Started",
                               `Your trial period has started and ends on ${endDate.toLocaleDateString()}.`,
                               NotificationType.INFO
                             );
                         }
                     }
                }
                break;
            }
            case "customer.subscription.trial_will_end": {
                const subscription = event.data.object as Stripe.Subscription;
                const users = await prisma.user.findMany({ where: { subscriptionId: subscription.id } });
                const user = users.length > 0 ? users[0] : null;
                
                if (user && user.email) {
                    await sendTemplateEmail('trial_ending', user.email, {
                        name: user.name || 'User',
                        endDate: new Date((subscription as any).current_period_end * 1000).toLocaleDateString()
                    });
                    await NotificationService.sendBilling(
                      user.id,
                      "Trial Ending Soon",
                      `Your trial period ends on ${new Date((subscription as any).current_period_end * 1000).toLocaleDateString()}. You will be billed for the next cycle.`,
                      NotificationType.WARNING
                    );
                }
                break;
            }
            case "customer.subscription.deleted": {
                const subscription = event.data.object as Stripe.Subscription;
                
                const users = await prisma.user.findMany({
                    where: { subscriptionId: subscription.id },
                    select: { id: true, email: true, name: true }
                });
                const user = users && users.length > 0 ? users[0] : null;

                await prisma.user.updateMany({
                    where: { subscriptionId: subscription.id },
                    data: {
                        plan: "Free",
                        subscriptionId: null,
                        subscriptionEnd: null,
                        scansUsedThisMonth: 0,
                        hasHadTrial: true
                    } as any
                });

                if (user) {
                    await prisma.billingHistory.create({
                        data: {
                            userId: user.id,
                            action: 'cancelled',
                            source: 'stripe'
                        }
                    });

                    await logActivity({
                        req,
                        actorId: 'system',
                        actorName: 'Stripe Webhook',
                        targetUserId: user.id,
                        action: 'Subscription Cancelled',
                        module: 'Stripe',
                        description: `Subscription ${subscription.id} cancelled`
                    });
                }
                
                if (user?.email) {
                    await sendTemplateEmail('subscription_cancelled', user.email, {
                        name: user.name || 'User'
                    });

                    await NotificationService.sendBilling(
                      user.id,
                      "Subscription Cancelled",
                      "Your subscription has been cancelled and you are now on the Free plan.",
                      NotificationType.WARNING
                    );
                }

                if (posthog && user?.id) {
                    posthog.capture({
                        distinctId: user.id,
                        event: 'Cancellation'
                    });
                }
                break;
            }
            case "invoice.created":
            case "invoice.paid":
            case "invoice.payment_failed": {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;
                
                const users = await prisma.user.findMany({
                    where: { stripeCustomerId: customerId }
                });
                const user = users && users.length > 0 ? users[0] : null;
                
                if (user) {
                    await prisma.invoice.upsert({
                        where: { stripeInvoiceId: invoice.id },
                        create: {
                            userId: user.id,
                            stripeInvoiceId: invoice.id,
                            invoiceNumber: invoice.number,
                            amount: (invoice.subtotal || 0) / 100,
                            tax: ((invoice as any).tax || 0) / 100,
                            discount: (invoice.total_discount_amounts?.reduce((sum, item) => sum + item.amount, 0) || 0) / 100,
                            total: (invoice.total || 0) / 100,
                            currency: invoice.currency,
                            paymentStatus: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' || invoice.status === 'draft' ? 'pending' : 'failed',
                            invoiceUrl: invoice.hosted_invoice_url,
                            pdfUrl: invoice.invoice_pdf
                        },
                        update: {
                            paymentStatus: invoice.status === 'paid' ? 'paid' : invoice.status === 'open' || invoice.status === 'draft' ? 'pending' : 'failed',
                            invoiceUrl: invoice.hosted_invoice_url,
                            pdfUrl: invoice.invoice_pdf
                        }
                    });

                    if (event.type === 'invoice.payment_failed') {
                        await NotificationService.sendBilling(
                            user.id,
                            "Payment Failed",
                            "Your recent payment failed. Please update your billing info.",
                            NotificationType.ERROR
                        );
                        
                        await sendTemplateEmail('payment_failed', user.email, {
                            name: user.name || 'User'
                        });
                    } else if (event.type === 'invoice.paid') {
                        if (user.email) {
                            await sendTemplateEmail('invoice_generated', user.email, {
                                name: user.name || 'User',
                                amount: ((invoice.total || 0) / 100).toFixed(2),
                                url: invoice.hosted_invoice_url || ''
                            });
                        }
                        if (invoice.billing_reason === 'subscription_cycle') {
                            // It's a renewal
                            await NotificationService.sendBilling(
                                user.id,
                                "Subscription Renewed",
                                "Your subscription has successfully renewed.",
                                NotificationType.SUCCESS
                            );
                            await prisma.billingHistory.create({
                                data: {
                                    userId: user.id,
                                    action: 'renewed',
                                    source: 'stripe'
                                }
                            });
                        }
                    }
                }
                break;
            }
            case "charge.refunded": {
                const charge = event.data.object as Stripe.Charge;
                const chargeInvoice = (charge as any).invoice;
                if (chargeInvoice) {
                    const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: chargeInvoice as string } });
                    if (invoice) {
                        const amountRefunded = (charge.amount_refunded || 0) / 100;
                        const isPartial = amountRefunded < invoice.total;
                        
                        await prisma.refund.upsert({
                            where: { stripeRefundId: charge.id },
                            create: {
                                invoiceId: invoice.id,
                                stripeRefundId: charge.id,
                                amount: amountRefunded,
                                status: "completed"
                            },
                            update: { status: "completed", amount: amountRefunded }
                        });
                        
                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { paymentStatus: isPartial ? "partial_refund" : "refunded" }
                        });
                        
                        await NotificationService.sendBilling(
                            invoice.userId,
                            isPartial ? "Partial Refund Issued" : "Refund Issued",
                            `A refund of $${amountRefunded.toFixed(2)} has been issued to your original payment method.`,
                            NotificationType.INFO
                        );
                    }
                }
                break;
            }
            case "charge.dispute.created": {
                const dispute = event.data.object as Stripe.Dispute;
                const charge = await stripe.charges.retrieve(dispute.charge as string);
                if (charge.customer) {
                   const users = await prisma.user.findMany({ where: { stripeCustomerId: charge.customer as string } });
                   if (users.length > 0) {
                      const user = users[0];
                      await prisma.user.update({
                         where: { id: user.id },
                         data: { plan: "Free", isSuspended: true, suspensionReason: "Chargeback Dispute Raised" }
                      });
                      await logActivity({
                         req,
                         actorId: 'system',
                         actorName: 'Stripe Webhook',
                         targetUserId: user.id,
                         action: 'User Suspended',
                         module: 'Security',
                         description: `Chargeback dispute ${dispute.id} raised`
                      });
                   }
                }
                break;
            }
            case "charge.dispute.closed": {
                const dispute = event.data.object as Stripe.Dispute;
                if (dispute.status === 'won') {
                    const charge = await stripe.charges.retrieve(dispute.charge as string);
                    if (charge.customer) {
                       const users = await prisma.user.findMany({ where: { stripeCustomerId: charge.customer as string } });
                       if (users.length > 0) {
                          const user = users[0];
                          let restorePlan = "Free";
                          if (user.subscriptionId) {
                              try {
                                  const sub = await stripe.subscriptions.retrieve(user.subscriptionId);
                                  if (sub.status === 'active' || sub.status === 'trialing') {
                                      const priceId = sub.items.data[0]?.price.id;
                                      const dbPlan = await prisma.plan.findFirst({
                                          where: { OR: [{ stripeMonthlyPriceId: priceId }, { stripeAnnualPriceId: priceId }] }
                                      });
                                      if (dbPlan) restorePlan = dbPlan.slug;
                                  }
                              } catch(e) {}
                          }
                          await prisma.user.update({
                             where: { id: user.id },
                             data: { plan: restorePlan, isSuspended: false, suspensionReason: null }
                          });
                          await logActivity({
                             req,
                             actorId: 'system',
                             actorName: 'Stripe Webhook',
                             targetUserId: user.id,
                             action: 'User Restored',
                             module: 'Security',
                             description: `Chargeback dispute ${dispute.id} won, access restored`
                          });
                       }
                    }
                }
                break;
            }
            case "customer.subscription.paused": {
                const subscription = event.data.object as Stripe.Subscription;
                await prisma.user.updateMany({
                   where: { subscriptionId: subscription.id },
                   data: { plan: "Free", scansUsedThisMonth: 0 }
                });
                break;
            }
            case "customer.subscription.resumed": {
                const subscription = event.data.object as any;
                const planId = subscription.plan?.id || subscription.items?.data?.[0]?.plan?.id || subscription.items?.data?.[0]?.price?.id;
                const dbPlan = await prisma.plan.findFirst({
                   where: { OR: [{ stripeMonthlyPriceId: planId }, { stripeAnnualPriceId: planId }] }
                });
                if (dbPlan) {
                   await prisma.user.updateMany({
                      where: { subscriptionId: subscription.id },
                      data: { subscriptionId: subscription.id, plan: dbPlan.slug, subscriptionEnd: new Date(subscription.current_period_end * 1000), hasHadTrial: true } as any
                   });
                }
                break;
            }
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error("Webhook unexpected error:", err.message);
        res.status(500).json({ error: "Webhook Error" });
    }
});



stripeRouter.get("/invoices", requireAuth, async (req: any, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ invoices });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

stripeRouter.post("/create-portal-session", requireAuth, async (req: any, res) => {
  try {
    const stripe = getStripe();
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ error: "No billing profile found" });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.VITE_APP_URL}/account`,
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: "Failed to create portal session" });
  }
});
