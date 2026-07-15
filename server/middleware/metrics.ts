import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

export const trackApiMetrics = (req: Request, res: Response, next: NextFunction) => {
  // Fire and forget, don't await so it doesn't block the request
  const endpoint = req.baseUrl || req.path;
  const method = req.method;
  
  // We only care about /api endpoints and skip health checks
  if (!req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/api/health')) {
      return next();
  }

  // Normalize date to current UTC day
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  prisma.apiMetric.upsert({
    where: {
      endpoint_method_date: {
        endpoint,
        method,
        date: today
      }
    },
    update: { count: { increment: 1 } },
    create: {
      endpoint,
      method,
      date: today,
      count: 1
    }
  }).catch(err => {
    // Just swallow error to not crash request on DB failure
    console.error("Failed to track API metric:", err);
  });

  next();
};
