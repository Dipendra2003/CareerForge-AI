import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import helmet from "helmet";
import { logger } from "../services/logger";
import * as Sentry from "@sentry/node";

const isProduction = process.env.NODE_ENV === "production";
const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? new Redis(redisUrl) : undefined;

const createRedisStore = (prefix: string) => {
  return redisClient ? new RedisStore({
    sendCommand: (...args: [string, ...string[]]) => redisClient.call(...args) as any,
    prefix,
  }) : undefined;
};

export const securityHeaders = helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.supabase.co", "https://*.stripe.com", "https://b.stripecdn.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://api.stripe.com", "https://*.posthog.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://checkout.stripe.com"],
    },
  } : false,
});

export const apiRateLimiter = rateLimit({
  store: createRedisStore('rl:api:'),
  windowMs: 15 * 60 * 1000, 
  max: 300, 
  standardHeaders: true, 
  legacyHeaders: false, 
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false },
  skip: () => !isProduction,
  message: { error: "Too many requests, please try again later." }
});

export const authRateLimiter = rateLimit({
  store: createRedisStore('rl:auth:'),
  windowMs: 60 * 1000, 
  max: 60, 
  standardHeaders: true, 
  legacyHeaders: false, 
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false },
  skip: () => !isProduction,
  message: { error: "Too many auth requests, please try again later." }
});

export const resendVerificationRateLimiter = rateLimit({
  store: createRedisStore('rl:resend_verify:'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, 
  standardHeaders: true, 
  legacyHeaders: false, 
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false },
  skip: () => !isProduction,
  message: { error: "You can only request 10 verification emails per hour." }
});

export const analyzeRateLimiter = rateLimit({
  store: createRedisStore('rl:analyze:'),
  windowMs: 60 * 1000, 
  max: 30, 
  standardHeaders: true, 
  legacyHeaders: false, 
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false },
  skip: () => !isProduction,
  message: { error: "Too many analyze requests, please try again later." }
});

export const toolsRateLimiter = rateLimit({
  store: createRedisStore('rl:tools:'),
  windowMs: 60 * 1000, 
  max: 50, 
  standardHeaders: true, 
  legacyHeaders: false, 
  validate: { trustProxy: false, xForwardedForHeader: false, forwardedHeader: false },
  skip: () => !isProduction,
  message: { error: "Too many tool requests, please try again later." }
});

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    
    const allowedOrigins = [
      process.env.VITE_APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      "https://careerforgeai.com"
    ].filter(Boolean);

    const isValidOrigin = origin && allowedOrigins.includes(origin);
    const host = req.headers.host;
    const isSameHost = origin && host && origin.includes(host);
    const isValidRunApp = origin && origin.startsWith("https://") && origin.endsWith(".run.app");

    if (origin && !isValidOrigin && !isSameHost && !isValidRunApp) {
        return res.status(403).json({ error: "CSRF blocked: Invalid origin" });
    }
  }
  next();
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error("Server Error", err, { path: req.path, method: req.method });
  Sentry.captureException(err);
  res.status(500).json({ error: "Internal server error" });
};

