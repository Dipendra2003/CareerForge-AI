import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../services/auth/jwt";
import prisma from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: any;
}

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // Proceed as guest
    }

    const token = authHeader.split(" ")[1];
    
    // Verifies token and retrieves user data
    try {
      const decoded = verifyAccessToken(token);
      if (decoded && decoded.userId) {
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (user) {
          req.user = user;
        }
      }
    } catch (e) {
      // ignore invalid optional token
    }

    next();
  } catch (err) {
    console.error("Optional Auth Middleware Error:", err);
    next();
  }
};

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.split(" ")[1];
    
    // Verifies token and retrieves user data
    try {
      const decoded = verifyAccessToken(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: "Invalid token structure" });
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      if (user.isSuspended) {
        return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
      }

      req.user = user;
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(500).json({ error: "Internal server error during authentication" });
  }
};

export const requireFeature = (featureSlug: string) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const planSlug = req.user.plan?.toLowerCase() || "free";
    const userRole = req.user.role?.toLowerCase() || "user";

    // Auto-grant access to all features for Admins
    if (userRole === "admin") {
      return next();
    }
    
    const featureRecord = await prisma.feature.findFirst({
        where: { name: { contains: featureSlug, mode: 'insensitive' } }
    });
    
    if (featureRecord) {
        // Check manual overrides
        const override = await (prisma as any).userFeatureOverride.findFirst({
            where: {
                userId: req.user.id,
                featureId: featureRecord.id,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });
        
        if (override) {
            if (override.action === 'grant') return next();
            if (override.action === 'revoke') return res.status(402).json({ error: `Feature '${featureSlug}' has been revoked for your account.` });
        }
    }

    // Lookup plan and its features
    const plan = await prisma.plan.findUnique({
      where: { slug: planSlug },
      include: {
        features: {
          include: {
            feature: true
          }
        }
      }
    });

    if (!plan) {
      if (planSlug === "free") {
        return res.status(402).json({ error: `Feature '${featureSlug}' requires an upgrade.` });
      }
      return res.status(402).json({ error: "Active plan not found" });
    }

    // Check if the plan has the required feature enabled
    const hasFeature = plan.features.some(pf => pf.feature.name.toLowerCase().includes(featureSlug.toLowerCase()) && pf.enabled);

    if (!hasFeature) {
      return res.status(402).json({ error: `Feature '${featureSlug}' requires an upgrade.` });
    }

    next();
  } catch (err) {
    console.error("Feature Validation Error:", err);
    res.status(500).json({ error: "Internal server error during feature validation" });
  }
};

export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Must be used AFTER requireAuth
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = req.user.role?.toLowerCase();
    
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }

    next();
  } catch (err) {
    console.error("Admin Validation Error:", err);
    res.status(500).json({ error: "Internal server error during admin validation" });
  }
};
