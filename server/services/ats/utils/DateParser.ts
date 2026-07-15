export class DateParser {
  /**
   * Calculates total years of experience from an array of employment objects.
   * Handles formats: "Jan 2020", "2020-01-01", "2020", "Winter 2022", "Present"
   */
  static calculateTotalYears(experience: { startDate?: string; endDate?: string; isCurrent?: boolean }[]): number {
    let totalMonths = 0;

    experience.forEach(exp => {
      if (!exp.startDate) return;

      const start = this.parseDate(exp.startDate);
      const end = (exp.isCurrent || (exp.endDate && exp.endDate.toLowerCase().includes("present")))
        ? new Date()
        : (exp.endDate ? this.parseDate(exp.endDate) : start);

      if (start && end) {
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        if (diffMonths >= 0) {
          totalMonths += diffMonths || 6; // Assume at least 6 months if same month but valid job
        }
      }
    });

    return totalMonths / 12;
  }

  /**
   * Parses a flexible date string into a Date object.
   */
  static parseDate(dateStr: string): Date | null {
    const str = dateStr.trim().toLowerCase();
    
    // Check for explicit ISO formats or standard parseable formats
    const standardParse = Date.parse(str);
    if (!isNaN(standardParse)) {
      return new Date(standardParse);
    }

    // Try extracting Year and Month
    const yearMatch = str.match(/\b(19|20)\d{2}\b/);
    if (!yearMatch) return null;
    
    const year = parseInt(yearMatch[0], 10);
    let month = 0; // default January

    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    for (let i = 0; i < months.length; i++) {
      if (str.includes(months[i])) {
        month = i;
        break;
      }
    }

    // Handle seasons
    if (str.includes("spring")) month = 2; // March
    if (str.includes("summer")) month = 5; // June
    if (str.includes("fall") || str.includes("autumn")) month = 8; // September
    if (str.includes("winter")) month = 11; // December

    return new Date(year, month, 1);
  }
}

