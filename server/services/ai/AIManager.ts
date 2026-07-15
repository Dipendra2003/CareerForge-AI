import * as crypto from "crypto";
import { ProviderManager } from "./ProviderManager";
import { HealthManager } from "./HealthManager";
import { CircuitBreaker } from "./CircuitBreaker";
import { FailoverManager } from "./FailoverManager";
import { RetryManager } from "./RetryManager";
import prisma from "../../lib/prisma";
import { AIModel } from "./AITypes";

export class AIManager {
  private static instance: AIManager;
  
  public providerManager: ProviderManager;
  public healthManager: HealthManager;
  public circuitBreaker: CircuitBreaker;
  public failoverManager: FailoverManager;
  
  private constructor() {
    this.providerManager = new ProviderManager();
    this.healthManager = new HealthManager();
    this.circuitBreaker = new CircuitBreaker(this.healthManager);
    this.failoverManager = new FailoverManager(this.healthManager, this.circuitBreaker);
  }

  public static async getInstance(): Promise<AIManager> {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
      await AIManager.instance.healthManager.init();
      AIManager.instance.startBackgroundJob();
    }
    return AIManager.instance;
  }
  
  private startBackgroundJob() {
    // Background health monitoring every 5 minutes
    setInterval(async () => {
      try {
        await this.providerManager.discoverAllModels();
        // Check HALF_OPEN models and attempt recovery (could add specific test logic here)
      } catch (e) {
        console.error("Background AI sync failed", e);
      }
    }, 5 * 60 * 1000);
  }

  // In-memory cache for Step 12: Caching
  private responseCache: Map<string, string> = new Map();

  async generateContent(prompt: string, config: any = {}): Promise<string> {
    // Check Cache first
    const cacheKey = crypto.createHash('sha256').update(prompt + JSON.stringify(config)).digest('hex');
    if (this.responseCache.has(cacheKey)) {
      return this.responseCache.get(cacheKey)!;
    }

    const settings = await prisma.aISetting.findFirst();
    const isFailoverEnabled = settings?.enableFailover ?? true;
    let maxRetries = settings?.failoverRetryCount ?? 3;
    let currentModelName = "gemini-2.5-flash"; // Force upgrading model for better schema handling
    let preferredModel = settings?.preferredModel || undefined;
    
    // Initial Discovery ensuring models exist
    let models = await this.providerManager.discoverAllModels();
    
    // If cache is empty due to API Key failure, try to fall back to DB setting
    if (models.length === 0) {
      if (currentModelName && this.providerManager.getProvider("gemini")?.isConfigured()) {
        console.warn("Model discovery failed or returned empty. Attempting to use DB model as blind fallback.");
        models = [{ name: currentModelName, displayName: currentModelName, version: "", inputTokenLimit: 0, outputTokenLimit: 0, supportedActions: ["generateContent"], thinking: false, description: "" }];
      } else {
        throw new Error("AI Generation halted: Model discovery failed and no safe fallback is available.");
      }
    }
    
    // Select initial model via FailoverManager if current is OPEN
    let selectedModel = models.find(m => m.name === currentModelName);
    if (!selectedModel || this.circuitBreaker.isOpen(selectedModel.name)) {
      selectedModel = this.failoverManager.getNextBestModel(models, undefined, preferredModel);
      
      if (isFailoverEnabled && selectedModel.name !== currentModelName) {
        await this.logFailover(currentModelName, selectedModel.name, "Initial routing due to primary model being OPEN or missing", null);
      }
      currentModelName = selectedModel.name;
    }
    
    let attempt = 0;
    while (attempt <= maxRetries) {
      const startTime = Date.now();
      try {
        const provider = this.providerManager.getProviderForModel(currentModelName);
        const result = await provider.generateContent(currentModelName, prompt, config);
        
        await this.healthManager.recordSuccess(currentModelName, Date.now() - startTime);
        this.circuitBreaker.markSuccess(currentModelName);
        
        // Save to cache
        this.responseCache.set(cacheKey, result);
        
        return result;
        
      } catch (err: any) {
        await this.healthManager.recordFailure(currentModelName);
        
        if (RetryManager.isUserError(err)) {
          throw err; // DO NOT failover for prompt injections or malformed requests
        }
        
        if (RetryManager.isImmediateFailover(err) && isFailoverEnabled) {
          // Immediately route to next model
          this.circuitBreaker.markFailure(currentModelName, settings?.failoverCooldownMins ?? 5);
          const nextModel = this.failoverManager.getNextBestModel(models, currentModelName, preferredModel);
          await this.logFailover(currentModelName, nextModel.name, "Immediate Failover triggered by Provider", err.message);
          
          currentModelName = nextModel.name;
          attempt++;
          continue;
        }

        if (isFailoverEnabled) {
          this.circuitBreaker.markFailure(currentModelName, settings?.failoverCooldownMins ?? 5);
          if (this.circuitBreaker.isOpen(currentModelName)) {
            const nextModel = this.failoverManager.getNextBestModel(models, currentModelName, preferredModel);
            await this.logFailover(currentModelName, nextModel.name, "Circuit Breaker OPEN", err.message);
            
            currentModelName = nextModel.name;
            attempt++;
            continue;
          }
        }
        
        if (RetryManager.isRecoverableSameModel(err)) {
          if (attempt < maxRetries) {
            attempt++;
            await RetryManager.sleep(Math.pow(2, attempt) * 1000);
            continue;
          } else if (isFailoverEnabled) {
            this.circuitBreaker.markFailure(currentModelName, settings?.failoverCooldownMins ?? 5);
            const nextModel = this.failoverManager.getNextBestModel(models, currentModelName, preferredModel);
            await this.logFailover(currentModelName, nextModel.name, "Max Retries Exhausted", err.message);
            
            currentModelName = nextModel.name;
            attempt = 0;
            continue;
          }
        }
        
        throw err;
      }
    }
    
    throw new Error("Generate Content failed: Max attempts exhausted across all models.");
  }
  
  private async logFailover(oldModel: string, newModel: string, reason: string, errorMsg: string | null) {
    try {
      await this.healthManager.recordFailover(oldModel);
      await prisma.auditLog.create({
        data: {
          action: "AI_MODEL_FAILOVER",
          module: "AIManager",
          description: `Automatic failover from ${oldModel} to ${newModel}. Reason: ${reason}` + (errorMsg ? `. Error: ${errorMsg}` : ''),
          oldValue: oldModel,
          newValue: newModel,
          status: "SUCCESS"
        }
      });
    } catch (e) {
      console.error("Failed to log failover", e);
    }
  }
}
