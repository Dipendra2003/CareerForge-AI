import { GoogleGenAI } from "@google/genai";
import { AIProvider, AIModel } from "../AITypes";

export class GeminiProvider implements AIProvider {
  id = "gemini";
  private ai: GoogleGenAI;
  
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  
  isConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY;
  }
  
  async discoverModels(): Promise<AIModel[]> {
    if (!this.isConfigured()) return [];
    
    const response = await this.ai.models.list();
    const models: AIModel[] = [];
    
    for await (const m of response) {
      const actions = m.supportedActions || [];
      if (!actions.includes("generateContent")) continue;
      
      const nameStr = m.name.toLowerCase();
      if (
        nameStr.includes("embedding") ||
        nameStr.includes("imagen") ||
        nameStr.includes("veo") ||
        nameStr.includes("audio") ||
        nameStr.includes("tts") ||
        nameStr.includes("live") ||
        nameStr.includes("robotics") ||
        nameStr.includes("aqa") ||
        nameStr.includes("deep-research") ||
        nameStr.includes("translate") ||
        nameStr.includes("computer-use")
      ) {
        continue;
      }
      
      models.push({
        name: m.name.startsWith("models/") ? m.name.substring(7) : m.name,
        displayName: m.displayName || m.name,
        version: m.version || "N/A",
        inputTokenLimit: m.inputTokenLimit || 0,
        outputTokenLimit: m.outputTokenLimit || 0,
        supportedActions: actions,
        thinking: !!m.thinking,
        description: m.description || ""
      });
    }
    
    return models;
  }
  
  async generateContent(model: string, prompt: string, config: any = {}): Promise<string> {
    const geminiConfig: any = { ...config };
    if (config.maxTokens) {
      geminiConfig.maxOutputTokens = config.maxTokens;
      delete geminiConfig.maxTokens;
    }
    
    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config: geminiConfig
    });
    return response.text || "";
  }
}
