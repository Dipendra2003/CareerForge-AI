import { logger } from "./logger";

export function parseGeminiJson(rawText: string): string {
  if (!rawText) return "";
  const match = rawText.match(/```(?:json)?\n?([\s\S]*?)```/);
  return match ? match[1].trim() : rawText.trim();
}

export function containsInjection(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const injectionKeywords = [
    "ignore previous instructions",
    "disregard all previous instructions",
    "system prompt",
    "forget previous",
    "you are now a",
    "bypass instructions",
  ];
  return injectionKeywords.some((keyword) => lower.includes(keyword));
}
