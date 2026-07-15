export interface AIModel {
  name: string;
  displayName: string;
  version: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedActions: string[];
  thinking: boolean;
  description: string;
}

export interface AIProvider {
  id: string;
  isConfigured(): boolean;
  discoverModels(): Promise<AIModel[]>;
  generateContent(model: string, prompt: string, config?: any): Promise<string>;
}
