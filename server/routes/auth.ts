import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import prisma from "../lib/prisma";
import jwtAuthRouter from "./auth/index";

const authRouter = Router();

// Mount the new custom JWT logic onto the main auth router (e.g. /api/auth/register)
authRouter.use("/", jwtAuthRouter);

authRouter.get("/session", (req, res) => {
  res.json({ user: null });
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!userRecord) {
      return res.status(404).json({ error: "User record not found" });
    }

    res.json({ user: userRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching user" });
  }
});

export default authRouter;
