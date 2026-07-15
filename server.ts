import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { createServer as createViteServer } from "vite";
import * as Sentry from "@sentry/node";
import { execSync } from "child_process";

import healthRouter from "./server/routes/health";
import scansRouter from "./server/routes/scans";
import authRouter from "./server/routes/auth";
import userRouter from "./server/routes/user";
import { securityHeaders, apiRateLimiter, authRateLimiter, analyzeRateLimiter, toolsRateLimiter, errorHandler, csrfProtection } from "./server/middleware/security";
import { trackApiMetrics } from "./server/middleware/metrics";

import parseRouter from "./server/routes/parse";

import analyzeRouter from "./server/routes/analyze";
import toolsRouter from "./server/routes/tools";
import workspaceRouter from "./server/routes/workspace";
import adminRouter from "./server/routes/admin";
import contactRouter from "./server/routes/contact";
import resumesRouter from "./server/routes/resumes";
import notificationsRouter from "./server/routes/notifications";
import billingRouter from "./server/routes/billing";
import { stripeRouter, stripeWebhookRouter } from "./server/routes/stripe";
import { startPosthog } from "./server/services/posthogLoader";
import { seedDefaultData } from "./server/lib/seed";
import { startCronJobs } from "./server/lib/cron";
import "./server/services/queue/AtsWorker";

// Init Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
});

async function startServer() {
  const app = express();
  
  // Seed database settings, plans, features, and email templates
  await seedDefaultData();
  
  // Start background jobs (Quota resets, Reconciliation)
  startCronJobs();
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn("WARNING: Cloudinary environment variables are missing. File uploads to Cloudinary may fail.");
  }

  
  
  // start Posthog backend
  startPosthog();

  // The request handler must be the first middleware on the app
  Sentry.setupExpressErrorHandler(app);

  app.set("trust proxy", 1);

  // Security
  app.use(securityHeaders);
  app.use(cors());

  // Logging
  app.use(morgan("dev"));

  // Track API hits
  app.use('/api', trackApiMetrics);

  // Stripe Webhooks (must be before express.json parsing)
  app.use("/api/stripe", stripeWebhookRouter);

  app.use(cookieParser());
  app.use(express.json({ limit: "5mb" }));

  const PORT = 3000;

  // API Index Route - Shows available endpoints
  app.get("/api", (req, res) => {
    res.json({
      name: "ResumeAI API",
      version: "1.0.0",
      status: "running",
      endpoints: {
        public: {
          health: "/api/health",
          public_data: "/api/public",
          contact: "/api/contact"
        },
        authentication: {
          login: "/api/auth/login",
          register: "/api/auth/register",
          logout: "/api/auth/logout",
          me: "/api/auth/me",
          google: "/api/auth/google",
          verify_email: "/api/auth/verify-email",
          forgot_password: "/api/auth/forgot-password",
          reset_password: "/api/auth/reset-password"
        },
        protected: {
          scans: "/api/scans",
          resumes: "/api/resumes",
          analyze: "/api/analyze",
          tools: "/api/tools",
          user: "/api/user",
          notifications: "/api/notifications",
          billing: "/api/billing",
          workspace: "/api/workspace"
        },
        admin: {
          dashboard: "/api/admin",
          users: "/api/admin/users",
          settings: "/api/admin/settings",
          analytics: "/api/admin/analytics"
        }
      },
      documentation: "Visit / for the web application"
    });
  });

  // Real Production Endpoints to be wired to server/routes
  app.use("/api/health", healthRouter);
  app.use("/api/public", (await import("./server/routes/public")).default);
  app.use("/api/auth", authRateLimiter, authRouter);
  app.use("/api/user", userRouter);
  app.use("/api/parse", parseRouter);
  app.use("/api/contact", contactRouter);
  
  // Protected API routes wrapper
  app.use("/api", apiRateLimiter, csrfProtection);
  app.use("/api/scans", scansRouter);
  app.use("/api/resumes", resumesRouter);
  app.use("/api/analyze", analyzeRateLimiter, analyzeRouter);
  app.use("/api/tools", toolsRateLimiter, toolsRouter);
  app.use("/api/workspace", workspaceRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/stripe", stripeRouter);

  // Dynamic SEO routes
  app.get("/robots.txt", async (req, res) => {
    try {
      const { default: prisma } = await import("./server/lib/prisma");
      const settings = await prisma.sEOSetting.findFirst();
      
      let robots = `User-agent: *\n`;
      if (settings?.robotsTxtDisallow) {
        settings.robotsTxtDisallow.split("\n").forEach(line => {
          if (line.trim()) robots += `Disallow: ${line.trim()}\n`;
        });
      }
      if (settings?.robotsTxtAllow) {
        settings.robotsTxtAllow.split("\n").forEach(line => {
          if (line.trim()) robots += `Allow: ${line.trim()}\n`;
        });
      }
      if (settings?.robotsTxtSitemap) {
        robots += `Sitemap: ${settings.robotsTxtSitemap}\n`;
      } else {
        const host = req.get('host');
        const protocol = req.protocol || 'https';
        robots += `Sitemap: ${protocol}://${host}/sitemap.xml\n`;
      }
      
      res.type("text/plain").send(robots);
    } catch (e) {
      res.type("text/plain").send("User-agent: *\nDisallow:");
    }
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const { default: prisma } = await import("./server/lib/prisma");
      const pages = await prisma.sEOPage.findMany({ where: { isIndexed: true } });
      const host = req.get('host');
      const protocol = req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;

      let sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      sitemap += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      for (const page of pages) {
        // Assume pageKey like "home" -> "/", "about" -> "/about"
        const path = page.pageKey === "home" ? "" : `/${page.pageKey}`;
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}${path}</loc>\n`;
        sitemap += `    <lastmod>${page.updatedAt.toISOString()}</lastmod>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>${page.pageKey === "home" ? "1.0" : "0.8"}</priority>\n`;
        sitemap += `  </url>\n`;
      }

      sitemap += `</urlset>`;
      res.type("application/xml").send(sitemap);
    } catch (e) {
      res.status(500).end();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    const isDev = process.env.NODE_ENV !== "production";
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    
    console.log("\n" + "=".repeat(60));
    console.log("🚀 ResumeAI Server Started Successfully!");
    console.log("=".repeat(60));
    console.log(`📍 Environment: ${isDev ? "Development" : "Production"}`);
    console.log(`🌐 Frontend:    ${appUrl}`);
    console.log(`🔌 API:         http://localhost:${PORT}/api`);
    console.log(`💚 Health:      http://localhost:${PORT}/api/health`);
    console.log("=".repeat(60));
    console.log(`\n✨ Open your browser and visit: \x1b[36m\x1b[4m${appUrl}\x1b[0m\n`);
  });
}

startServer();

