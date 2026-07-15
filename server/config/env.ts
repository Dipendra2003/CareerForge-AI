import { z } from "zod";

const envSchema = z.object({
  // Using generic names as fallback or explicit env names
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  GOOGLE_REDIRECT_URI: z.string().min(1, "GOOGLE_REDIRECT_URI is required"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.string().min(1, "SMTP_PORT is required"),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASSWORD: z.string().min(1, "SMTP_PASSWORD is required"),
  SMTP_FROM: z.string().min(1, "SMTP_FROM is required"),
  VITE_APP_URL: z.string().min(1, "VITE_APP_URL is required"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NODE_ENV: z.string().default("development"),
});

export const env = envSchema.parse(process.env);
