export class SkillDictionary {
  private static aliases: Record<string, string> = {
    "js": "JavaScript",
    "reactjs": "React",
    "react.js": "React",
    "node": "Node.js",
    "nodejs": "Node.js",
    "ts": "TypeScript",
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "mongo": "MongoDB",
    "postgres": "PostgreSQL",
    "next": "Next.js",
    "nextjs": "Next.js",
    "vuejs": "Vue.js",
    "k8s": "Kubernetes",
    "aws": "Amazon Web Services",
    "gcp": "Google Cloud Platform",
    "ml": "Machine Learning",
    "ai": "Artificial Intelligence",
    "c#": "C#",
    "c++": "C++",
    "golang": "Go",
    "html5": "HTML",
    "css3": "CSS",
    "rest api": "REST APIs",
    "restful api": "REST APIs",
    "my sql": "MySQL",
    "rbac": "Role Based Access Control",
    "role-based access control": "Role Based Access Control",
    "jwt": "JWT Authentication",
    "jwt auth": "JWT Authentication"
  };

  /**
   * Normalizes a given skill string to its canonical form if an alias exists.
   */
  static normalize(skill: string): string {
    // Strip parentheticals like "(e.g., React, Angular)" from AI outputs
    const cleanedSkill = skill.replace(/\\s*\\([^)]*\\)/g, '').trim();
    const lower = cleanedSkill.toLowerCase();
    return this.aliases[lower] || cleanedSkill;
  }

  /**
   * Returns the canonical name and all known aliases for a given skill.
   * Useful for searching a block of raw text for any variation.
   */
  static getVariations(skill: string): string[] {
    const canonical = this.normalize(skill).toLowerCase();
    const variations = new Set<string>([canonical]);
    
    // Add original in case it's not the canonical
    variations.add(skill.toLowerCase().trim());
    
    // Find all aliases that map to this canonical
    for (const [alias, mappedCanonical] of Object.entries(this.aliases)) {
      if (mappedCanonical.toLowerCase() === canonical) {
        variations.add(alias);
      }
    }
    
    return Array.from(variations);
  }

  /**
   * Extends the dictionary dynamically
   */
  static addAlias(alias: string, canonical: string) {
    this.aliases[alias.toLowerCase().trim()] = canonical.trim();
  }
}
