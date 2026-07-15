import { StructuredResume, StructuredJD } from "./Types";
import { ResumeSchema } from "./ResumeSchema";
import { JDSchema } from "./JDSchema";

export class Validation {
  static validateResume(data: any): StructuredResume {
    const parsed = ResumeSchema.safeParse(data);
    if (!parsed.success) {
      console.error("Resume validation failed:", parsed.error);
      throw new Error("Invalid structured resume JSON format");
    }
    
    let resume = parsed.data;
    
    // Additional domain validations
    if (resume.personalInfo?.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(resume.personalInfo.email)) {
        resume.personalInfo.email = null;
      }
    }
    
    if (resume.links) {
      resume.links = resume.links.filter(link => link.url && (link.url.startsWith("http://") || link.url.startsWith("https://")));
    }
    
    return resume;
  }

  static validateJD(data: any): StructuredJD {
    const parsed = JDSchema.safeParse(data);
    if (!parsed.success) {
      console.error("JD validation failed:", parsed.error);
      throw new Error("Invalid structured JD JSON format");
    }
    return parsed.data;
  }
}
