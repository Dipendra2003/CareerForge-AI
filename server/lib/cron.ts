import cron from 'node-cron';
import prisma from './prisma';
import { getStripe } from '../routes/stripe';
import { NotificationService } from '../services/notification/NotificationService';

export function startCronJobs() {
  // 1. Reset Quotas - Runs at midnight on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    console.log('[Cron] Resetting monthly AI scans quota...');
    try {
      await prisma.user.updateMany({
        data: {
          scansUsedThisMonth: 0
        }
      });
      console.log('[Cron] Monthly AI scans quota reset successfully.');
    } catch (error) {
      console.error('[Cron] Error resetting monthly AI scans quota:', error);
    }
  });

  // 2. Stripe Financial Synchronization & Analytics Cache (Hourly)
  // This maintains exact Stripe accuracy without live blocking admin requests
  cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Running Stripe Financial Synchronization & Reconciliation...');
    await runStripeReconciliation();
  });

  // 3. Notification Scheduled Broadcasts (Every minute)
  cron.schedule('* * * * *', async () => {
    try {
      const lockKey = "cron:notifications";
      const now = new Date();
      
      // Attempt to claim lock. 
      await prisma.systemLock.upsert({
        where: { key: lockKey },
        update: {},
        create: { key: lockKey, lockedAt: now, expiresAt: new Date(now.getTime() - 1000) }
      });

      const claimed = await prisma.systemLock.updateMany({
        where: { key: lockKey, expiresAt: { lte: now } },
        data: { lockedAt: now, expiresAt: new Date(now.getTime() + 55000) }
      });

      if (claimed.count === 0) {
        return; // Another instance is running
      }

      await NotificationService.executeScheduled();

      // Release lock
      await prisma.systemLock.updateMany({
        where: { key: lockKey },
        data: { expiresAt: new Date() }
      });
    } catch (error) {
      console.error('[Cron] Error executing scheduled notifications:', error);
    }
  });
}

export async function runStripeReconciliation() {
  try {
    const stripe = getStripe();
    let mrr = 0;
    let arr = 0;
    let activeSubsCount = 0;

    let hasMore = true;
    let startingAfter = undefined;

    while (hasMore) {
      const subs: any = await stripe.subscriptions.list({
        status: 'all', // We need to check active, past_due, canceled for reconciliation
        limit: 100,
        starting_after: startingAfter
      });

      for (const sub of subs.data) {
        // --- 1. MRR/ARR Calculation (Only Active/Trialing) ---
        if (sub.status === 'active' || sub.status === 'trialing') {
          activeSubsCount++;
          if (sub.plan && sub.plan.amount) {
            const amount = sub.plan.amount / 100;
            if (sub.plan.interval === 'month') {
              mrr += amount * sub.quantity;
              arr += amount * 12 * sub.quantity;
            } else if (sub.plan.interval === 'year') {
              mrr += (amount / 12) * sub.quantity;
              arr += amount * sub.quantity;
            }
          }
        }

        // --- 2. Automatic Reconciliation (Detect Out-of-Sync) ---
        const customerId = sub.customer;
        if (typeof customerId === 'string') {
          const user = await prisma.user.findUnique({
            where: { stripeCustomerId: customerId }
          });

          if (user) {
            // Stripe says it's canceled/unpaid, but local DB still says it's paid
            if ((sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'past_due' || sub.status === 'incomplete' || sub.status === 'incomplete_expired') && user.plan !== 'free') {
               await prisma.user.update({
                 where: { id: user.id },
                 data: {
                   plan: 'free',
                   subscriptionId: null,
                   subscriptionEnd: null
                 }
               });
               await prisma.billingHistory.create({
                  data: {
                    userId: user.id,
                    action: 'reconciled_downgrade',
                    previousPlan: user.plan,
                    newPlan: 'free',
                    source: 'system_reconciliation'
                  }
               });
               console.log(`[Reconciliation] Downgraded user ${user.id} to free due to Stripe status mismatch (${sub.status}).`);
            }
            
            // Stripe says active/trialing, check if DB is out of sync (including tier mismatches)
            if (sub.status === 'active' || sub.status === 'trialing') {
               const planId = sub.plan.id;
               const dbPlan = await prisma.plan.findFirst({
                 where: {
                   OR: [
                     { stripeMonthlyPriceId: planId },
                     { stripeAnnualPriceId: planId }
                   ]
                 }
               });
               
               if (dbPlan) {
                  if (user.plan !== dbPlan.slug || user.subscriptionId !== sub.id) {
                      await prisma.user.update({
                        where: { id: user.id },
                        data: {
                          plan: dbPlan.slug,
                          subscriptionId: sub.id,
                          subscriptionEnd: new Date(sub.current_period_end * 1000)
                        }
                      });
                      await prisma.billingHistory.create({
                          data: {
                              userId: user.id,
                              action: 'reconciled_tier_sync',
                              previousPlan: user.plan,
                              newPlan: dbPlan.slug,
                              source: 'system_reconciliation'
                          }
                      });
                      console.log(`[Reconciliation] Reconciled user ${user.id} to ${dbPlan.slug} due to Stripe tier mismatch.`);
                  }
               } else {
                 console.warn(`[Reconciliation] Could not find local plan for Stripe price ID ${planId} for user ${user.id}.`);
               }
            }
          }
        }
      }

      if (subs.has_more) {
        startingAfter = subs.data[subs.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    // 3. Sync Recent Invoices & Refunds (Missed Webhook Protection)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recentInvoices = await stripe.invoices.list({ created: { gte: thirtyDaysAgo }, limit: 100 });
    for (const invoice of recentInvoices.data) {
       const user = await prisma.user.findFirst({ where: { stripeCustomerId: invoice.customer as string } });
       if (user) {
           await prisma.invoice.upsert({
               where: { stripeInvoiceId: invoice.id },
               create: {
                   userId: user.id,
                   stripeInvoiceId: invoice.id,
                   invoiceNumber: invoice.number,
                   amount: (invoice.subtotal || 0) / 100,
                   tax: ((invoice as any).tax || 0) / 100,
                   discount: (invoice.total_discount_amounts?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0) / 100,
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
       }
    }

    const recentRefunds = await stripe.refunds.list({ created: { gte: thirtyDaysAgo }, limit: 100 });
    for (const refund of recentRefunds.data) {
       if (refund.payment_intent) {
           const charge = await stripe.charges.list({ payment_intent: refund.payment_intent as string, limit: 1 });
           if (charge.data.length > 0 && (charge.data[0] as any).invoice) {
               const invoice = await prisma.invoice.findUnique({ where: { stripeInvoiceId: (charge.data[0] as any).invoice as string } });
               if (invoice) {
                   const amountRefunded = refund.amount / 100;
                   const isPartial = amountRefunded < invoice.total;
                   await prisma.refund.upsert({
                       where: { stripeRefundId: refund.id },
                       create: {
                           invoiceId: invoice.id,
                           stripeRefundId: refund.id,
                           amount: amountRefunded,
                           status: "completed"
                       },
                       update: { status: "completed", amount: amountRefunded }
                   });
                   await prisma.invoice.update({
                       where: { id: invoice.id },
                       data: { paymentStatus: isPartial ? "partial_refund" : "refunded" }
                   });
               }
           }
       }
    }

    // Calculate Metrics
    const arpu = activeSubsCount > 0 ? (mrr / activeSubsCount) : 0;
    
    let churnRate = 0;
    let ltv = 0;
    try {
        const thirtyDaysAgoDate = new Date(thirtyDaysAgo * 1000);
        
        // Find subscriptions that were cancelled in the last 30 days
        const cancelledRecords = await prisma.billingHistory.findMany({
            where: {
                action: 'cancelled',
                createdAt: { gte: thirtyDaysAgoDate }
            }
        });
        
        // Ensure we only count unique users who cancelled
        const uniqueCancelledUserIds = new Set(cancelledRecords.map(r => r.userId));
        const cancelledCount = uniqueCancelledUserIds.size;
        
        const totalStartSubs = activeSubsCount + cancelledCount;
        churnRate = totalStartSubs > 0 ? (cancelledCount / totalStartSubs) * 100 : 0;
        ltv = churnRate > 0 ? arpu / (churnRate / 100) : 0;
    } catch(e) {
        console.error("Churn calculation failed:", e);
    }

    // Save analytics cache
    await prisma.financialAnalyticsCache.upsert({
      where: { id: 'current' },
      update: {
        mrr,
        arr,
        activeSubs: activeSubsCount,
        churnRate,
        ltv,
        arpu,
        lastSyncedAt: new Date()
      },
      create: {
        id: 'current',
        mrr,
        arr,
        activeSubs: activeSubsCount,
        churnRate,
        ltv,
        arpu,
        lastSyncedAt: new Date()
      }
    });

    console.log('[Cron] Stripe Financial Synchronization Complete. MRR cached.');
  } catch (error: any) {
    console.error('[Cron] Stripe Financial Synchronization Failed:', error.message);
  }
}
