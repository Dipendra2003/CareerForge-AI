import prisma from '../lib/prisma';
import { Request } from 'express';

interface LogOptions {
  req?: any; // Express request object
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  targetUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  module?: string;
  action: string;
  oldValue?: any | null;
  newValue?: any | null;
  status?: string;
  description?: string;
}

export const logActivity = async (options: LogOptions) => {
  try {
    const {
      req,
      action,
      targetUserId,
      targetType,
      targetId,
      module,
      oldValue,
      newValue,
      status,
      description
    } = options;

    let actorId = options.actorId || req?.user?.id;
    let actorName = options.actorName || req?.user?.name;
    let actorEmail = options.actorEmail || req?.user?.email;
    const ipAddress = req?.ip || req?.socket?.remoteAddress;
    const userAgent = req?.headers ? req.headers['user-agent'] : undefined;
    const requestMethod = req?.method;
    const endpoint = req?.originalUrl || req?.url;

    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorName: actorName || null,
        actorEmail: actorEmail || null,
        targetUserId: targetUserId || null,
        targetType: targetType || null,
        targetId: targetId || null,
        module: module || 'System',
        action,
        oldValue: oldValue ? (typeof oldValue === 'string' ? JSON.parse(oldValue) : oldValue) : null,
        newValue: newValue ? (typeof newValue === 'string' ? JSON.parse(newValue) : newValue) : null,
        ipAddress: ipAddress ? String(ipAddress) : null,
        userAgent: userAgent ? String(userAgent) : null,
        requestMethod: requestMethod || null,
        endpoint: endpoint || null,
        status: status || 'Success',
        description: description || null
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

// Backwards compatibility for existing logAdminAction calls
export const logAdminAction = async (
  req: any,
  action: string,
  targetUserId?: string | null,
  oldValue?: string | null,
  newValue?: string | null,
  module?: string
) => {
  let parsedOldValue = null;
  let parsedNewValue = null;

  try {
    if (oldValue) parsedOldValue = typeof oldValue === 'string' && oldValue.startsWith('{') ? JSON.parse(oldValue) : { value: oldValue };
  } catch(e) { parsedOldValue = { value: oldValue }; }

  try {
    if (newValue) parsedNewValue = typeof newValue === 'string' && newValue.startsWith('{') ? JSON.parse(newValue) : { value: newValue };
  } catch(e) { parsedNewValue = { value: newValue }; }

  await logActivity({
    req,
    action,
    targetUserId,
    module: module || 'Admin',
    oldValue: parsedOldValue,
    newValue: parsedNewValue
  });
};

export const cleanupAuditLogs = async () => {
  try {
    const settings = await prisma.systemSetting.findFirst();
    if (!settings || !settings.auditLogRetentionDays) {
      return; // No retention configured (forever)
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.auditLogRetentionDays);

    const deleted = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    if (deleted.count > 0) {
      console.log(`Cleaned up ${deleted.count} old audit logs.`);
    }
  } catch (error) {
    console.error('Failed to cleanup audit logs:', error);
  }
};


