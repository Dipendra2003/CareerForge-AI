import { z } from "zod";

export const ResumeSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
  }).nullable().optional(),
  summary: z.string().nullable().optional(),
  skills: z.array(z.string()).default([]),
  experience: z.array(z.object({
    title: z.string().nullable().optional(),
    company: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    isCurrent: z.boolean().nullable().optional(),
    description: z.string().nullable().optional(),
    achievements: z.array(z.string()).nullable().optional(),
  })).default([]),
  education: z.array(z.object({
    degree: z.string().nullable().optional(),
    institution: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    gpa: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })).default([]),
  projects: z.array(z.object({
    name: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    technologies: z.array(z.string()).nullable().optional(),
    url: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
  })).nullable().optional(),
  certifications: z.array(z.object({
    name: z.string().nullable().optional(),
    issuer: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  })).default([]),
  achievements: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  links: z.array(z.object({
    name: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
  })).nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional()
});
