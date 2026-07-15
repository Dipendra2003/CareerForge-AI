import { z } from "zod";

export const JDSchema = z.object({
  title: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  requiredSkills: z.array(z.string()).nullable().optional(),
  preferredSkills: z.array(z.string()).nullable().optional(),
  responsibilities: z.array(z.string()).nullable().optional(),
  experience: z.object({
    minimumYears: z.number().nullable().optional(),
    maximumYears: z.number().nullable().optional(),
  }).nullable().optional(),
  education: z.object({
    minimumDegree: z.string().nullable().optional(),
    preferredDegree: z.string().nullable().optional(),
  }).nullable().optional(),
  keywords: z.array(z.string()).nullable().optional(),
});
