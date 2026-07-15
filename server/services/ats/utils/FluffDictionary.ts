export class FluffDictionary {
  static readonly FLUFF_WORDS = [
    "team player", "hard worker", "detail-oriented", "detail oriented", 
    "think outside the box", "go-getter", "dynamic", "synergy", 
    "results-driven", "results driven", "self-starter", "self starter", 
    "thought leader", "strategic thinker", "fast learner", "highly motivated",
    "passionate", "proactive", "visionary", "excellent communication",
    "good communication", "multitasker", "works well under pressure"
  ];

  static countFluff(text: string): number {
    const lowerText = text.toLowerCase();
    let count = 0;
    this.FLUFF_WORDS.forEach(word => {
      // Create a regex to match the exact phrase with word boundaries
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    return count;
  }
}
