import { z } from "zod";
import { ResumeSchema } from "./ResumeSchema";
import { JDSchema } from "./JDSchema";

export type StructuredResume = z.infer<typeof ResumeSchema>;
export type StructuredJD = z.infer<typeof JDSchema>;
