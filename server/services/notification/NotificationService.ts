import prisma from "../../lib/prisma";
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationCategory,
  NotificationAudience,
  NotificationScheduleStatus
} from "../../types/notification";
import { sendEmail } from "../email/emailService";

interface SendNotificationParams {
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  icon?: string;
  actionUrl?: string;
  actionText?: string;
  createdBy?: string;
}

interface BroadcastParams extends Omit<SendNotificationParams, 'userId'> {
  audience: NotificationAudience | string;
}

export class NotificationService {
  
  /**
   * Centralized decision on whether to deliver a notification based on user preferences.
   * Business-critical notifications are always delivered.
   */
  static shouldDeliverNotification(
    category: NotificationCategory | undefined,
    prefs: any | null
  ): boolean {
    if (!prefs) return true; // Default to deliver if no preferences found

    switch (category) {
      case NotificationCategory.SECURITY:
      case NotificationCategory.SYSTEM:
      case NotificationCategory.MAINTENANCE:
        // Always deliver business-critical notifications
        return true;
      case NotificationCategory.BILLING:
        return prefs.billingEnabled !== false;
      case NotificationCategory.AI:
        return prefs.aiEnabled !== false;
      case NotificationCategory.PROMOTION:
      case NotificationCategory.ANNOUNCEMENT:
        return prefs.marketingEnabled !== false;
      default:
        // Default to true for unspecified categories if inAppEnabled is true
        return prefs.inAppEnabled !== false;
    }
  }

  /**
   * Dispatches an email asynchronously without blocking the main execution loop.
   */
  private static dispatchEmailAsync(to: string, title: string, message: string, actionUrl?: string) {
    const html = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2>${title}</h2>
        <p>${message}</p>
        ${actionUrl ? `<a href="${actionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Details</a>` : ''}
      </div>
    `;
    const text = `${title}\n\n${message}\n\n${actionUrl ? `Link: ${actionUrl}` : ''}`;
    
    // Encapsulate async execution to prevent blocking
    Promise.resolve().then(() => 
      sendEmail({
        to,
        subject: title,
        html,
        text
      })
    ).catch(err => {
      console.error(`[NotificationService] Failed to dispatch async email to ${to}:`, err);
    });
  }
  
  static async send(params: SendNotificationParams, tx?: any) {
    const db = tx || prisma;
    
    if (params.userId) {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        include: { notificationPreference: true } // Assuming relation exists, if not we fetch separately
      }).catch(() => null);

      let prefs = null;
      let userEmail = null;

      if (user) {
        userEmail = user.email;
        // If the relation isn't direct, we fetch it
        prefs = await db.notificationPreference.findUnique({ where: { userId: params.userId } }).catch(() => null);
      }

      if (!this.shouldDeliverNotification(params.category, prefs)) {
        return null; // Silently skip based on preference
      }

      // Check if we should send an email for HIGH/URGENT priority
      if (userEmail && 
         (params.priority === NotificationPriority.HIGH || params.priority === NotificationPriority.URGENT) &&
         (!prefs || prefs.emailEnabled !== false)) {
         this.dispatchEmailAsync(userEmail, params.title, params.message, params.actionUrl);
      }
    }

    return db.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        priority: params.priority || NotificationPriority.NORMAL,
        icon: params.icon,
        actionUrl: params.actionUrl,
        actionText: params.actionText,
        createdBy: params.createdBy,
      }
    });
  }

  static async broadcast(params: BroadcastParams, tx?: any) {
    const db = tx || prisma;
    const chunkSize = parseInt(process.env.NOTIFICATION_BROADCAST_CHUNK_SIZE || "1000");

    let whereClause: any = {};
    if (params.audience === NotificationAudience.ALL_USERS) {
      whereClause = {};
    } else if (params.audience === NotificationAudience.ALL_ADMINS) {
      whereClause = { role: "admin" };
    } else if (params.audience === NotificationAudience.FREE_PLAN) {
      whereClause = { plan: "free" };
    } else if (params.audience === NotificationAudience.PRO_PLAN) {
      whereClause = { plan: "pro" };
    }

    let cursor = undefined;
    let totalProcessed = 0;
    let hasMore = true;

    while (hasMore) {
      const users: any[] = await db.user.findMany({
        where: whereClause,
        select: { id: true, email: true },
        take: chunkSize,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { id: 'asc' }
      });

      if (users.length === 0) {
        hasMore = false;
        break;
      }

      cursor = users[users.length - 1].id;

      // Fetch preferences for this chunk
      const userIds = users.map(u => u.id);
      const prefs = await db.notificationPreference.findMany({
        where: { userId: { in: userIds } }
      });
      const prefMap = new Map<string, any>(prefs.map((p: any) => [p.userId, p]));

      const dataToInsert = [];

      for (const u of users) {
        const userPrefs = prefMap.get(u.id) as any;

        if (!this.shouldDeliverNotification(params.category, userPrefs)) {
          continue; // Skip user
        }

        dataToInsert.push({
          userId: u.id,
          title: params.title,
          message: params.message,
          type: params.type,
          category: params.category,
          priority: params.priority || NotificationPriority.NORMAL,
          icon: params.icon,
          actionUrl: params.actionUrl,
          actionText: params.actionText,
          createdBy: params.createdBy,
        });

        // Email dispatch for high priority
        if ((params.priority === NotificationPriority.HIGH || params.priority === NotificationPriority.URGENT) &&
            (!userPrefs || userPrefs.emailEnabled !== false)) {
          this.dispatchEmailAsync(u.email, params.title, params.message, params.actionUrl);
        }
      }

      if (dataToInsert.length > 0) {
        await db.notification.createMany({ data: dataToInsert, skipDuplicates: true });
        totalProcessed += dataToInsert.length;
      }
    }
    
    return totalProcessed;
  }

  static async schedule(params: BroadcastParams & { sendAt: Date }) {
    return prisma.notificationSchedule.create({
      data: {
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        priority: params.priority || NotificationPriority.NORMAL,
        icon: params.icon,
        actionUrl: params.actionUrl,
        actionText: params.actionText,
        audience: params.audience,
        sendAt: params.sendAt,
        status: NotificationScheduleStatus.PENDING,
        createdBy: params.createdBy,
      }
    });
  }

  static async executeScheduled() {
    const schedules = await prisma.notificationSchedule.findMany({
      where: {
        status: NotificationScheduleStatus.PENDING,
        sendAt: { lte: new Date() }
      },
      take: 10 // Process in batches
    });

    for (const schedule of schedules) {
      try {
        // Atomically claim this schedule to prevent race conditions across concurrent workers
        const claimed = await prisma.notificationSchedule.updateMany({
          where: { 
            id: schedule.id,
            status: NotificationScheduleStatus.PENDING
          },
          data: { status: NotificationScheduleStatus.PROCESSING }
        });

        if (claimed.count === 0) {
          // Another worker process has already claimed this execution
          continue;
        }

        // Broadcast directly without a wrapping transaction to allow internal chunking
        const count = await this.broadcast({
          title: schedule.title,
          message: schedule.message,
          type: schedule.type as NotificationType,
          category: schedule.category as NotificationCategory,
          priority: schedule.priority as NotificationPriority,
          icon: schedule.icon || undefined,
          actionUrl: schedule.actionUrl || undefined,
          actionText: schedule.actionText || undefined,
          audience: schedule.audience,
          createdBy: schedule.createdBy || undefined,
        });

        // Mark as completed
        await prisma.notificationSchedule.update({
          where: { id: schedule.id },
          data: { status: NotificationScheduleStatus.COMPLETED }
        });

        // Log Audit
        await prisma.auditLog.create({
          data: {
            actorId: schedule.createdBy,
            module: "NOTIFICATIONS",
            action: "EXECUTE_SCHEDULED_BROADCAST",
            description: `Executed scheduled broadcast ${schedule.id} to ${count} users.`
          }
        });

      } catch (error: any) {
        console.error(`[NotificationService] Failed to execute schedule ${schedule.id}:`, error);
        await prisma.notificationSchedule.update({
          where: { id: schedule.id },
          data: { 
            status: NotificationScheduleStatus.FAILED,
            // Assuming we'd add an error log or retries later, but for now just fail it
          }
        });
      }
    }
  }

  // --- Type-safe Helpers ---
  static async sendSystem(userId: string, title: string, message: string, actionUrl?: string) {
    return this.send({
      userId, title, message, actionUrl,
      type: NotificationType.INFO,
      category: NotificationCategory.SYSTEM,
    });
  }

  static async sendBilling(userId: string, title: string, message: string, type: NotificationType = NotificationType.INFO) {
    return this.send({
      userId, title, message,
      type,
      category: NotificationCategory.BILLING,
    });
  }

  static async sendAI(userId: string, title: string, message: string, type: NotificationType = NotificationType.SUCCESS, actionUrl?: string) {
    return this.send({
      userId, title, message, actionUrl,
      type,
      category: NotificationCategory.AI,
    });
  }

  static async sendWorkspace(userId: string, title: string, message: string, type: NotificationType = NotificationType.SUCCESS) {
    return this.send({
      userId, title, message,
      type,
      category: NotificationCategory.WORKSPACE,
    });
  }

  static async sendAuthentication(userId: string, title: string, message: string, type: NotificationType = NotificationType.INFO) {
    return this.send({
      userId, title, message,
      type,
      category: NotificationCategory.SECURITY,
    });
  }

  static async sendSecurity(userId: string, title: string, message: string, type: NotificationType = NotificationType.WARNING) {
    return this.send({
      userId, title, message,
      type,
      category: NotificationCategory.SECURITY,
      priority: NotificationPriority.HIGH,
    });
  }

  static async sendAdmin(title: string, message: string, type: NotificationType = NotificationType.WARNING) {
    // Send to all admins
    return this.broadcast({
      audience: NotificationAudience.ALL_ADMINS,
      title, message, type,
      category: NotificationCategory.SYSTEM,
      priority: NotificationPriority.HIGH,
    });
  }

  // --- Status Modifiers ---
  static async markRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return false;
    
    if (notification.userId === userId) {
      await prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
    } else if (notification.userId === null) {
      await prisma.notification.update({ where: { id: notificationId }, data: { readByIds: { push: userId } } });
    }
    return true;
  }

  static async markAllRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    const unreadBroadcasts = await prisma.notification.findMany({
      where: { userId: null, NOT: { readByIds: { has: userId } } }
    });
    for (const b of unreadBroadcasts) {
      await prisma.notification.update({
        where: { id: b.id },
        data: { readByIds: { push: userId } }
      });
    }
  }

  static async archive(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return false;
    
    if (notification.userId === userId) {
      await prisma.notification.update({ where: { id: notificationId }, data: { isArchived: true } });
    } else if (notification.userId === null) {
      await prisma.notification.update({ where: { id: notificationId }, data: { archivedByIds: { push: userId } } });
    }
    return true;
  }

  static async delete(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
    if (!notification) return false;
    
    if (notification.userId === userId) {
      await prisma.notification.delete({ where: { id: notificationId } });
    } else if (notification.userId === null) {
      // Actually archive it for broadcasts, you can't delete a broadcast for everyone just because one user wanted to
      await prisma.notification.update({ where: { id: notificationId }, data: { archivedByIds: { push: userId } } });
    }
    return true;
  }
}
