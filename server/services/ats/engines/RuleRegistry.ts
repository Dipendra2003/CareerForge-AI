import { BaseEngine } from "./BaseRule";
import { FormattingEngine } from "./FormattingEngine";
import { ContactEngine } from "./ContactEngine";
import { SummaryEngine } from "./SummaryEngine";
import { ExperienceEngine } from "./ExperienceEngine";
import { EducationEngine } from "./EducationEngine";
import { ProjectsEngine } from "./ProjectsEngine";
import { GrammarEngine } from "./GrammarEngine";
import { AchievementsEngine } from "./AchievementsEngine";
import { KeywordEngine } from "./KeywordEngine";
import { ATSCompatibilityEngine } from "./ATSCompatibilityEngine";
import { BulletAnalysisEngine } from "./BulletAnalysisEngine";
import { RepetitionEngine } from "./RepetitionEngine";

export class RuleRegistry {
  static getEngines(): BaseEngine[] {
    return [
      new FormattingEngine(),
      new ContactEngine(),
      new SummaryEngine(),
      new ExperienceEngine(),
      new EducationEngine(),
      new ProjectsEngine(),
      new GrammarEngine(),
      new AchievementsEngine(),
      new KeywordEngine(),
      new ATSCompatibilityEngine(),
      new BulletAnalysisEngine(),
      new RepetitionEngine()
    ];
  }
}
