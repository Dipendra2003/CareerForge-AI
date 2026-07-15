import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import Stripe from "stripe";
import securityRouter from './user/security';

const userRouter = Router();

userRouter.use('/security', securityRouter);

userRouter.post("/change-plan", requireAuth, async (req: AuthRequest, res) => {
  const { plan } = req.body;
  if (!plan) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  try {
    const validPlan = await prisma.plan.findUnique({
      where: { slug: plan.toLowerCase() }
    });

    if (!validPlan && plan.toLowerCase() !== "free") {
      return res.status(400).json({ error: "Invalid plan" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { plan: validPlan?.name || "Free" }
    });

    res.json({ message: "Plan updated successfully", user: updatedUser });
  } catch (err) {
    console.error("Plan Update Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

userRouter.post("/export", requireAuth, async (req: AuthRequest, res) => {
  try {
     const user = await prisma.user.findUnique({ where: { id: req.user.id } });
     const scans = await prisma.scan.findMany({ where: { userId: req.user.id } });
     
     const exportData = {
         user,
         scans: scans || []
     };
     
     res.setHeader('Content-disposition', `attachment; filename=careerforgeai_relational_data_${req.user.id}.json`);
     res.setHeader('Content-type', 'application/json');
     res.status(200).send(JSON.stringify(exportData, null, 2));
  } catch (err) {
     res.status(500).json({ error: "Failed to export data" });
  }
});

userRouter.delete("/account", requireAuth, async (req: AuthRequest, res) => {
  try {
     // Check if they have a stripe sub
     const user = await prisma.user.findUnique({
       where: { id: req.user.id },
       select: { stripeCustomerId: true, subscriptionId: true }
     });
     
     if (user?.subscriptionId && process.env.STRIPE_SECRET_KEY) {
         try {
             const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
                  apiVersion: "2025-02-24.acacia" as any
             });
             await stripeClient.subscriptions.cancel(user.subscriptionId);
         } catch (e: any) {
             console.error("Failed to cancel stripe subscription during account deletion", e.message);
         }
     }
     
     // Delete user in Prisma
     await prisma.user.delete({ where: { id: req.user.id } });
     
     res.json({ success: true });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Account deletion failed" });
  }
});

export default userRouter;

import multer from "multer";
import cloudinary from "../services/cloudinary";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB
});

userRouter.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  const { name, email } = req.body;
  try {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail && existingEmail.id !== req.user.id) {
      return res.status(400).json({ error: "Email already in use" });
    }
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email }
    });
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

userRouter.post("/avatar", requireAuth, upload.single("avatar"), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "No image provided" });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true }
    });

    const uploadToCloudinary = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'user_avatars', resource_type: 'image' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file!.buffer);
      });
    };

    const cloudinaryResult = await uploadToCloudinary();
    
    // DB transaction: Update user avatar
    await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: cloudinaryResult.secure_url }
    });

    // Cleanup old avatar from Cloudinary to prevent orphans
    if (user?.avatarUrl && user.avatarUrl.includes("cloudinary.com")) {
      try {
        const urlParts = user.avatarUrl.split("/");
        const filenameWithExt = urlParts[urlParts.length - 1];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${filenameWithExt.split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (e) {
        console.error("Failed to delete old avatar from Cloudinary:", e);
      }
    }

    res.json({ avatarUrl: cloudinaryResult.secure_url });
  } catch (error) {
    console.error("Avatar upload error", error);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

userRouter.get("/connections", requireAuth, async (req: AuthRequest, res) => {
  try {
    const connections = await prisma.connectedAccount.findMany({ where: { userId: req.user.id } });
    res.json(connections);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch connections" });
  }
});

userRouter.delete("/connections/:provider", requireAuth, async (req: AuthRequest, res) => {
  const { provider } = req.params;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.passwordHash) {
      // Must have at least a password or another connection
      const connections = await prisma.connectedAccount.count({ where: { userId: req.user.id } });
      if (connections <= 1) {
        return res.status(400).json({ error: "Cannot disconnect your only login method. Please set a password first." });
      }
    }
    
    await prisma.connectedAccount.deleteMany({
      where: { userId: req.user.id, provider }
    });
    
    if (provider === 'google') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { googleId: null }
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect account" });
  }
});

userRouter.get("/notifications/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    let prefs = await prisma.notificationPreference.findUnique({ where: { userId: req.user.id } });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({ data: { userId: req.user.id } });
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

userRouter.put("/notifications/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    delete data.id;
    delete data.userId;
    delete data.createdAt;
    delete data.updatedAt;

    const updated = await prisma.notificationPreference.update({
      where: { userId: req.user.id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

