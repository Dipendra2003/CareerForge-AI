import { AIManager } from "../../ai/AIManager";
import { StructuredResume, StructuredJD } from "../Types";
import { ResumeSchema } from "../ResumeSchema";
import { JDSchema } from "../JDSchema";
import { Validation } from "../Validation";
import { Normalizer } from "../utils/Normalizer";
import { parseGeminiJson } from "../../aiUtils";

export class SemanticExtractor {
  
  static async extractResume(rawText: string): Promise<StructuredResume> {
    const aiManager = await AIManager.getInstance();
    
    const systemInstruction = `You are a highly precise semantic extractor for an enterprise ATS system. 
Your ONLY job is to convert the raw resume text into the requested JSON schema.
The input text might be flattened without newlines. You must carefully segment the text into appropriate sections (Experience, Education, Projects, Skills) based on context.
Extract all work experience (including internships, part-time, and full-time roles) into the 'experience' array. DO NOT leave this empty if the resume has any job history.
Extract all academic details into the 'education' array. DO NOT leave this empty if the resume has school history.
Extract all technical or personal projects into the 'projects' array.
Extract all information accurately. Do not hallucinate or add any information that is not present in the text.
CRITICAL FOR LINKS: Look for embedded hyperlinks, visible labels (like "LinkedIn", "GitHub", "LeetCode", "Portfolio"). Leave the URL empty ("") if only the label is present.
CRITICAL FOR ARRAYS: If a section exists in the text, you MUST populate its corresponding array. Do NOT return empty arrays for experience, education, or projects if they exist in the input. If a specific field within an object is missing (e.g., location, endDate, gpa), use an empty string "" instead of omitting the object.
Return the output strictly matching the provided JSON schema.`;

    const prompt = `Extract the structured information from the following resume:\n\n${rawText}`;
    
    let attempt = 0;
    while (attempt < 3) {
      try {
        const response = await aiManager.generateContent(prompt, {
          systemInstruction,
          temperature: 0.1, // Low temperature for deterministic extraction
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          // Constructing the schema object as expected by Gemini
          responseSchema: {
            type: "OBJECT",
            properties: {
              personalInfo: {
                type: "OBJECT",
                description: "Basic contact and personal details",
                properties: {
                  firstName: { type: "STRING", nullable: true },
                  lastName: { type: "STRING", nullable: true },
                  email: { type: "STRING", nullable: true },
                  phone: { type: "STRING", nullable: true },
                  location: { type: "STRING", nullable: true }
                }
              },
              summary: { type: "STRING", nullable: true, description: "Professional summary or objective" },
              skills: { type: "ARRAY", items: { type: "STRING" }, description: "List of technical and soft skills" },
              experience: {
                type: "ARRAY",
                description: "List of all work experiences, internships, part-time and full-time jobs. Do not leave this empty if any work history is found.",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", nullable: true },
                    company: { type: "STRING", nullable: true },
                    location: { type: "STRING", nullable: true },
                    startDate: { type: "STRING", nullable: true },
                    endDate: { type: "STRING", nullable: true },
                    isCurrent: { type: "BOOLEAN", nullable: true },
                    description: { type: "STRING", nullable: true, description: "Full text description of the role" },
                    achievements: { type: "ARRAY", items: { type: "STRING" }, description: "Bullet points describing achievements or responsibilities" }
                  }
                }
              },
              education: {
                type: "ARRAY",
                description: "List of academic qualifications, degrees, and schools",
                items: {
                  type: "OBJECT",
                  properties: {
                    degree: { type: "STRING", nullable: true },
                    institution: { type: "STRING", nullable: true },
                    location: { type: "STRING", nullable: true },
                    startDate: { type: "STRING", nullable: true },
                    endDate: { type: "STRING", nullable: true },
                    gpa: { type: "STRING", nullable: true },
                    description: { type: "STRING", nullable: true }
                  }
                }
              },
              projects: {
                type: "ARRAY",
                description: "List of technical, academic, or personal projects",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING", nullable: true },
                    description: { type: "STRING", nullable: true, description: "Full description of the project" },
                    technologies: { type: "ARRAY", items: { type: "STRING" } },
                    url: { type: "STRING", nullable: true },
                    startDate: { type: "STRING", nullable: true },
                    endDate: { type: "STRING", nullable: true }
                  }
                }
              },
              certifications: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    issuer: { type: "STRING" },
                    date: { type: "STRING" },
                    url: { type: "STRING" }
                  }
                }
              },
              achievements: { type: "ARRAY", items: { type: "STRING" } },
              languages: { type: "ARRAY", items: { type: "STRING" } },
              links: {
                type: "ARRAY",
                description: "URLs for LinkedIn, GitHub, Portfolio, etc.",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    url: { type: "STRING" }
                  }
                }
              }
            }
          }
        });

        const parsedJson = JSON.parse(parseGeminiJson(response));
        let validated = Validation.validateResume(parsedJson);
        
        // Normalize skills
        if (validated.skills) {
          validated.skills = Normalizer.normalizeSkills(validated.skills);
        }
        
        return validated;
      } catch (error) {
        console.error(`Resume Extraction Attempt ${attempt + 1} Failed:`, error);
        attempt++;
      }
    }
    
    throw new Error("Failed to extract structured resume after 3 attempts");
  }

  static async extractJD(rawText: string): Promise<StructuredJD> {
    const aiManager = await AIManager.getInstance();
    
    const systemInstruction = `You are a highly precise semantic extractor and expert HR technical recruiter. 
Your job is to convert the raw job description text into the requested JSON schema.
CRITICAL INSTRUCTION 1: If the provided text is a full, detailed job description, extract the exact skills and requirements listed. Do not hallucinate.
CRITICAL INSTRUCTION 2: HOWEVER, if the provided text is very short (e.g., just a job title like "Software Engineer Intern" or "Google Data Scientist"), you MUST act as an expert technical recruiter and INFER a comprehensive list of 10-15 standard requiredSkills, preferredSkills, and keywords that are industry-standard for that specific role and company. Do not leave the skills arrays empty if you can reasonably infer the industry standard requirements for the requested role.
CRITICAL INSTRUCTION 3: ALL skills in requiredSkills, preferredSkills, and keywords MUST be extremely concise (1-3 words maximum). NEVER use parentheticals, examples, or descriptive phrases (e.g., return "React", NOT "Front-end Framework (e.g., React, Angular, Vue.js)"). Extract the exact core technologies or concepts.
Return the output strictly matching the provided JSON schema.`;

    const prompt = `Extract the structured information from the following job description:\n\n${rawText}`;
    
    let attempt = 0;
    while (attempt < 3) {
      try {
        const response = await aiManager.generateContent(prompt, {
          systemInstruction,
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              company: { type: "STRING" },
              location: { type: "STRING" },
              employmentType: { type: "STRING" },
              seniority: { type: "STRING" },
              industry: { type: "STRING" },
              requiredSkills: { type: "ARRAY", items: { type: "STRING" } },
              preferredSkills: { type: "ARRAY", items: { type: "STRING" } },
              responsibilities: { type: "ARRAY", items: { type: "STRING" } },
              experience: {
                type: "OBJECT",
                properties: {
                  minimumYears: { type: "NUMBER" },
                  maximumYears: { type: "NUMBER" }
                }
              },
              education: {
                type: "OBJECT",
                properties: {
                  minimumDegree: { type: "STRING" },
                  preferredDegree: { type: "STRING" }
                }
              },
              keywords: { type: "ARRAY", items: { type: "STRING" } }
            }
          }
        });

        const parsedJson = JSON.parse(parseGeminiJson(response));
        let validated = Validation.validateJD(parsedJson);
        
        if (validated.requiredSkills) {
          validated.requiredSkills = Normalizer.normalizeSkills(validated.requiredSkills);
        }
        if (validated.preferredSkills) {
          validated.preferredSkills = Normalizer.normalizeSkills(validated.preferredSkills);
        }

        return validated;
      } catch (error) {
        console.error(`JD Extraction Attempt ${attempt + 1} Failed:`, error);
        attempt++;
      }
    }
    
    throw new Error("Failed to extract structured JD after 3 attempts");
  }
}
