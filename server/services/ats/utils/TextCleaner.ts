export class TextCleaner {
  static clean(text: string): string {
    if (!text) return "";
    
    let cleaned = text
      // Replace zero-width spaces and other invisible characters
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Normalize different types of bullets to standard bullet
      .replace(/[•◦▪]/g, "-")
      // Normalize different types of quotes
      .replace(/['"]/g, "'")
      .replace(/[""]/g, '"')
      // Normalize different types of dashes
      .replace(/[–—]/g, "-")
      // Replace multiple spaces with single space
      .replace(/\s+/g, " ")
      .trim();

    return cleaned;
  }
}
