import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../lib/prisma";
import cloudinary from "../services/cloudinary";
import { logActivity } from "../utils/auditLogger";

const resumesRouter = Router();

resumesRouter.get("/:id/download", requireAuth, async (req: any, res) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found or unauthorized" });
    }

    if (!resume.filePublicId) {
      return res.status(404).json({ error: "No file associated with this scan" });
    }

    // Generate authenticated download URL
    const downloadUrl = cloudinary.url(resume.filePublicId, {
      resource_type: "raw",
      type: "authenticated",
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
      attachment: true
    });

    await logActivity({ req, action: 'Resume Downloaded', module: 'Storage', description: `Downloaded resume: ${resume.id}` });

    res.json({ downloadUrl });
  } catch (error) {
    console.error("Resume download error", error);
    res.status(500).json({ error: "Failed to generate download link" });
  }
});

resumesRouter.delete("/:id", requireAuth, async (req: any, res) => {
  try {
    const resume = await prisma.resume.findUnique({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found or unauthorized" });
    }

    // Intentionally omit cloudinary destroy so we don't break scan history

    await prisma.resume.delete({
      where: {
        id: req.params.id
      }
    });

    await logActivity({ req, action: 'Resume Deleted', module: 'Storage', description: `Deleted resume: ${resume.id}` });

    res.json({ message: "Resume and scan deleted successfully" });
  } catch (error) {
    console.error("Resume deletion error", error);
    res.status(500).json({ error: "Failed to delete resume" });
  }
});

export default resumesRouter;

