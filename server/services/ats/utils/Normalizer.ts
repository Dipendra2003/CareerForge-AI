import { SkillDictionary } from "../registry/SkillDictionary";
import { TextCleaner } from "./TextCleaner";
import { DateParser } from "./DateParser";

export class Normalizer {
  static normalizeString(str: string | null | undefined): string | null {
    if (!str) return null;
    return TextCleaner.clean(str);
  }

  static normalizeArray(arr: string[] | null | undefined): string[] {
    if (!arr) return [];
    return arr
      .map(s => this.normalizeString(s))
      .filter((s): s is string => !!s);
  }

  static normalizeSkills(skills: string[] | null | undefined): string[] {
    if (!skills) return [];
    
    const cleaned = this.normalizeArray(skills);
    const normalized = cleaned.map(skill => SkillDictionary.normalize(skill));
    
    // Remove duplicates
    return Array.from(new Set(normalized));
  }
  
  static normalizeDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    const date = DateParser.parseDate(dateStr);
    return date ? date.toISOString() : null;
  }
}
