import { Router } from "express";
import prisma from "../../lib/prisma";
import { requireAuth, requireAdmin } from "../../middleware/auth";

const router = Router();
router.use(requireAuth, requireAdmin);

// Get SEO settings (global)
router.get("/settings", async (req, res) => {
  try {
    let settings = await prisma.sEOSetting.findFirst();
    if (!settings) {
      settings = await prisma.sEOSetting.create({
        data: {
          robotsTxtDisallow: "/admin\n/api\n/dashboard\n/login\n/signup",
          robotsTxtAllow: "/",
        }
      });
    }
    res.json(settings);
  } catch (error) {
    console.error("Error fetching SEO settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update SEO settings
router.put("/settings", async (req, res) => {
  try {
    const { robotsTxtDisallow, robotsTxtAllow, robotsTxtSitemap, globalFavicon } = req.body;
    let settings = await prisma.sEOSetting.findFirst();
    
    if (settings) {
      settings = await prisma.sEOSetting.update({
        where: { id: settings.id },
        data: { robotsTxtDisallow, robotsTxtAllow, robotsTxtSitemap, globalFavicon }
      });
    } else {
      settings = await prisma.sEOSetting.create({
        data: { robotsTxtDisallow, robotsTxtAllow, robotsTxtSitemap, globalFavicon }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        module: "SEO",
        action: "UPDATE_SETTINGS",
        description: "Updated global SEO settings",
      }
    });

    res.json(settings);
  } catch (error) {
    console.error("Error updating SEO settings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all SEO pages
router.get("/pages", async (req, res) => {
  try {
    const pages = await prisma.sEOPage.findMany({
      orderBy: { pageName: 'asc' }
    });
    res.json(pages);
  } catch (error) {
    console.error("Error fetching SEO pages:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create/Update SEO page
router.put("/pages/:pageKey", async (req, res) => {
  try {
    const { pageKey } = req.params;
    const data = req.body;
    
    let page = await prisma.sEOPage.findUnique({ where: { pageKey } });
    
    if (page) {
      page = await prisma.sEOPage.update({
        where: { pageKey },
        data: {
          pageName: data.pageName,
          title: data.title,
          description: data.description,
          keywords: data.keywords,
          canonicalUrl: data.canonicalUrl,
          robots: data.robots,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImage: data.ogImage,
          twitterTitle: data.twitterTitle,
          twitterDescription: data.twitterDescription,
          twitterImage: data.twitterImage,
          schemaType: data.schemaType,
          schemaJson: data.schemaJson,
          favicon: data.favicon,
          isIndexed: data.isIndexed
        }
      });
    } else {
      page = await prisma.sEOPage.create({
        data: {
          pageKey,
          pageName: data.pageName || pageKey,
          title: data.title,
          description: data.description,
          keywords: data.keywords,
          canonicalUrl: data.canonicalUrl,
          robots: data.robots,
          ogTitle: data.ogTitle,
          ogDescription: data.ogDescription,
          ogImage: data.ogImage,
          twitterTitle: data.twitterTitle,
          twitterDescription: data.twitterDescription,
          twitterImage: data.twitterImage,
          schemaType: data.schemaType,
          schemaJson: data.schemaJson,
          favicon: data.favicon,
          isIndexed: data.isIndexed !== undefined ? data.isIndexed : true
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: req.user?.id,
        actorEmail: req.user?.email,
        module: "SEO",
        action: "UPDATE_PAGE",
        description: `Updated SEO for page: ${pageKey}`,
        targetId: page.id
      }
    });

    res.json(page);
  } catch (error) {
    console.error("Error updating SEO page:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
