import { Router, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import { sendTemplateEmail } from "../services/email/emailService";
import prisma from "../lib/prisma";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limit: 5 requests per 15 minutes per IP
const contactRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV !== "production",
  message: { error: "Too many contact submissions. Please try again in 15 minutes." }
});

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  subject: z.string().min(1, "Subject is required"),
  category: z.string().optional().nullable(),
  message: z.string().min(1, "Message is required"),
});

const handleContact: RequestHandler = async (req, res): Promise<void> => {
  try {
    const { name, email, phone, subject, category, message } = contactSchema.parse(req.body);

    const ipAddress = req.ip || (req.headers["x-forwarded-for"] as string) || null;
    const userAgent = req.headers["user-agent"] || null;

    // 1. Create database record
    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        category: category || "General Inquiry",
        message,
        status: "New",
        priority: "Medium",
        ipAddress,
        userAgent,
      }
    });

    const adminEmail = process.env.ADMIN_EMAIL || "support@careerforgeai.com";

    // 2. Send admin notification
    await sendTemplateEmail('admin_notification', adminEmail, {
      name,
      email,
      subject,
      message,
    }).catch(err => console.error("[Contact API] Admin notification email failed:", err));
    
    // 3. Send auto-reply to user
    await sendTemplateEmail('contact_reply', email, {
      name,
      subject
    }).catch(err => console.error("[Contact API] Auto-reply email failed:", err));

    res.json({ success: true, message: "Message sent successfully", data: contactMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: error.issues[0].message });
       return;
    }
    console.error("[Contact API] Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

router.post("/", contactRateLimiter, handleContact);

export default router;

