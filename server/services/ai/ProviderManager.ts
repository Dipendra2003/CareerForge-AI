import { AIProvider, AIModel } from "./AITypes";
import { GeminiProvider } from "./providers/GeminiProvider";

export class ProviderManager {
  private providers: Map<string, AIProvider> = new Map();
  private availableModels: AIModel[] = [];
  
  private fetchPromise: Promise<AIModel[]> | null = null;
  private lastFetchTime = 0;

  constructor() {
    this.registerProvider(new GeminiProvider());
  }

  registerProvider(provider: AIProvider) {
    if (provider.isConfigured()) {
      this.providers.set(provider.id, provider);
    }
  }

  getProviderForModel(modelName: string): AIProvider {
    // Currently only Gemini exists, future could check model prefix or lookup table
    return this.providers.get("gemini")!;
  }

  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  async discoverAllModels(forceRefresh = false): Promise<AIModel[]> {
    if (!forceRefresh && this.availableModels.length > 0 && Date.now() - this.lastFetchTime < 15 * 60 * 1000) {
      return this.availableModels;
    }
    
    // Protection against cache stampede
    if (!forceRefresh && this.fetchPromise) {
      return this.fetchPromise;
    }

    this.fetchPromise = (async () => {
      let models: AIModel[] = [];
      for (const provider of Array.from(this.providers.values())) {
        try {
          const pModels = await provider.discoverModels();
          models = models.concat(pModels);
        } catch (e) {
          console.error(`Discovery failed for provider ${provider.id}`, e);
        }
      }
      return models;
    })();

    try {
      const result = await this.fetchPromise;
      if (result.length > 0) {
        this.availableModels = result;
        this.lastFetchTime = Date.now();
      }
      return result;
    } finally {
      this.fetchPromise = null;
    }
  }

  getCacheStatus() {
    return {
      lastFetch: this.lastFetchTime,
      isRefreshing: !!this.fetchPromise,
      modelCount: this.availableModels.length
    };
  }
}
