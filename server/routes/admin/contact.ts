import { Router, Request, Response } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { sendEmail } from "../../services/email/emailService";
import { logAdminAction } from "../../utils/auditLogger";

const router = Router();

// Zod schema for updating status
const updateStatusSchema = z.object({
  status: z.enum(["New", "Open", "In Progress", "Waiting", "Resolved", "Closed"])
});

// Zod schema for updating priority
const updatePrioritySchema = z.object({
  priority: z.enum(["Low", "Medium", "High", "Urgent"])
});

// Zod schema for assigning ticket
const assignSchema = z.object({
  assignedTo: z.string().nullable()
});

// Zod schema for reply
const replySchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  reply: z.string().min(1, "Reply body is required")
});

// GET /api/admin/contact/admins - Helper to list available admins for assignment
router.get("/admins", async (req: Request, res: Response) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: "asc" }
    });
    res.json({ admins });
  } catch (error) {
    console.error("[Admin Contact API] Error fetching admins:", error);
    res.status(500).json({ error: "Failed to fetch admin users" });
  }
});

// GET /api/admin/contact - List contact messages with filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      startDate,
      endDate,
      unread,
      limit = "100",
      offset = "0"
    } = req.query;

    const whereClause: any = {};

    // 1. Search filter
    if (search && typeof search === "string") {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } }
      ];
    }

    // 2. Status filter
    if (status && typeof status === "string" && status !== "all") {
      whereClause.status = status;
    }

    // 3. Priority filter
    if (priority && typeof priority === "string" && priority !== "all") {
      whereClause.priority = priority;
    }

    // 4. Category filter
    if (category && typeof category === "string" && category !== "all") {
      whereClause.category = category;
    }

    // 5. Assigned Admin filter
    if (assignedTo && typeof assignedTo === "string" && assignedTo !== "all") {
      whereClause.assignedTo = assignedTo === "unassigned" ? null : assignedTo;
    }

    // 6. Date Range filter
    if (startDate && typeof startDate === "string") {
      whereClause.createdAt = {
        ...(whereClause.createdAt || {}),
        gte: new Date(startDate)
      };
    }
    if (endDate && typeof endDate === "string") {
      whereClause.createdAt = {
        ...(whereClause.createdAt || {}),
        lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    // 7. Unread filter
    if (unread === "true") {
      whereClause.status = "New";
    }

    const total = await prisma.contactMessage.count({ where: whereClause });
    const messages = await prisma.contactMessage.findMany({
      where: whereClause,
      include: {
        replies: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json({ messages, total });
  } catch (error) {
    console.error("[Admin Contact API] Error fetching contact messages:", error);
    res.status(500).json({ error: "Failed to fetch contact messages" });
  }
});

// GET /api/admin/contact/:id - Get ticket details with timeline & replies
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({
      where: { id },
      include: {
        replies: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!message) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    res.json({ message });
  } catch (error) {
    console.error("[Admin Contact API] Error fetching ticket details:", error);
    res.status(500).json({ error: "Failed to fetch ticket details" });
  }
});

// POST /api/admin/contact/:id/reply - Admin replies to contact message
router.post("/:id/reply", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, reply } = replySchema.parse(req.body);
    const adminUser = (req as any).user; // Set by requireAuth middleware
    const adminId = adminUser?.id || null;

    const message = await prisma.contactMessage.findUnique({
      where: { id }
    });

    if (!message) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    // 1. Create Reply in DB
    const contactReply = await prisma.contactReply.create({
      data: {
        messageId: id,
        adminId,
        subject,
        reply
      }
    });

    // 2. Update Contact Message status to "Waiting" (waiting for user response)
    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: {
        status: "Waiting",
        repliedAt: new Date()
      }
    });

    // 3. Send email to recipient
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #4f46e5; margin-bottom: 20px;">Support Ticket Reply</h2>
        <p>Hi ${message.name},</p>
        <p>An administrator has replied to your support message.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; font-weight: bold; color: #1e293b; font-size: 14px;">Reply Content:</p>
          <p style="margin: 10px 0 0 0; color: #334155; font-size: 14px; white-space: pre-wrap;">${reply}</p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 25px; font-size: 12px; color: #64748b;">
          <p style="margin: 0 0 5px 0;"><strong>Original Ticket Details:</strong></p>
          <p style="margin: 0 0 3px 0;"><strong>Subject:</strong> ${message.subject}</p>
          <p style="margin: 0;"><strong>Your Message:</strong> ${message.message}</p>
        </div>
      </div>
    `;

    const emailText = `Hi ${message.name},\n\nAn administrator has replied to your support message.\n\nReply Content:\n${reply}\n\nOriginal Ticket Details:\nSubject: ${message.subject}\nMessage: ${message.message}`;

    await sendEmail({
      to: message.email,
      subject: `Re: [Ticket #${message.id.slice(0, 8)}] ${subject}`,
      html: emailHtml,
      text: emailText
    }).catch(err => console.error("[Admin Contact API] Email reply failed:", err));

    // 4. Log to AuditLog
    await logAdminAction(
      req,
      "Reply Sent",
      null,
      null,
      `Sent reply to ${message.email} on Ticket #${message.id.slice(0, 8)}`,
      "Contact Management"
    );

    res.json({ success: true, reply: contactReply, message: updatedMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error("[Admin Contact API] Error replying to message:", error);
    res.status(500).json({ error: "Failed to send reply" });
  }
});

// PATCH /api/admin/contact/:id/status - Update Ticket Status
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const oldMessage = await prisma.contactMessage.findUnique({ where: { id } });
    if (!oldMessage) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    const updateData: any = { status };
    if (status === "Closed") {
      updateData.closedAt = new Date();
    } else {
      updateData.closedAt = null;
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: updateData
    });

    // Log to AuditLog
    await logAdminAction(
      req,
      "Status Changed",
      null,
      JSON.stringify({ status: oldMessage.status }),
      JSON.stringify({ status }),
      "Contact Management"
    );

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error("[Admin Contact API] Error updating status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// PATCH /api/admin/contact/:id/priority - Update Ticket Priority
router.patch("/:id/priority", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { priority } = updatePrioritySchema.parse(req.body);

    const oldMessage = await prisma.contactMessage.findUnique({ where: { id } });
    if (!oldMessage) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { priority }
    });

    // Log to AuditLog
    await logAdminAction(
      req,
      "Priority Changed",
      null,
      JSON.stringify({ priority: oldMessage.priority }),
      JSON.stringify({ priority }),
      "Contact Management"
    );

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error("[Admin Contact API] Error updating priority:", error);
    res.status(500).json({ error: "Failed to update priority" });
  }
});

// PATCH /api/admin/contact/:id/assign - Assign Ticket to Admin
router.patch("/:id/assign", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = assignSchema.parse(req.body);

    const oldMessage = await prisma.contactMessage.findUnique({ where: { id } });
    if (!oldMessage) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: { assignedTo }
    });

    // Log to AuditLog
    await logAdminAction(
      req,
      "Assigned",
      null,
      JSON.stringify({ assignedTo: oldMessage.assignedTo }),
      JSON.stringify({ assignedTo }),
      "Contact Management"
    );

    res.json({ success: true, message: updatedMessage });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.issues[0].message });
      return;
    }
    console.error("[Admin Contact API] Error assigning message:", error);
    res.status(500).json({ error: "Failed to assign ticket" });
  }
});

// DELETE /api/admin/contact/:id - Delete Ticket
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const message = await prisma.contactMessage.findUnique({ where: { id } });
    if (!message) {
      res.status(404).json({ error: "Contact message not found" });
      return;
    }

    await prisma.contactMessage.delete({ where: { id } });

    // Log to AuditLog
    await logAdminAction(
      req,
      "Deleted",
      null,
      JSON.stringify(message),
      null,
      "Contact Management"
    );

    res.json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("[Admin Contact API] Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete ticket" });
  }
});

export default router;
