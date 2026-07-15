import rateLimit from 'express-rate-limit';

// Standard rate limit for reading notifications (120 reqs / 15 mins)
export const readNotificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for broadcasting (5 reqs / 1 min)
export const broadcastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many broadcast attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limit for scheduling (10 reqs / 1 min)
export const scheduleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many scheduling attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Delete rate limit (30 reqs / 1 min)
export const deleteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many delete attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
