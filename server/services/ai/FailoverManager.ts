import { AIModel } from "./AITypes";
import { HealthManager } from "./HealthManager";
import { CircuitBreaker } from "./CircuitBreaker";

export class FailoverManager {
  constructor(
    private healthManager: HealthManager,
    private circuitBreaker: CircuitBreaker
  ) {}

  public getNextBestModel(models: AIModel[], currentModelName?: string, preferredModel?: string): AIModel {
    if (!models || models.length === 0) {
      throw new Error("No models available for failover.");
    }
    
    // Score all models dynamically
    const scoredModels = models.map(m => ({
      model: m,
      score: this.scoreModel(m, preferredModel)
    }));
    
    // Sort descending by score
    scoredModels.sort((a, b) => b.score - a.score);
    
    // Find highest scoring model that is NOT the current model and NOT OPEN
    for (const sm of scoredModels) {
      if (sm.model.name === currentModelName) continue;
      if (this.circuitBreaker.isOpen(sm.model.name)) continue;
      return sm.model;
    }
    
    // If all other models are OPEN or unavailable, but we MUST pick one,
    // pick the absolute highest scoring model even if it's the current one,
    // as long as it's not OPEN.
    const fallback = scoredModels.find(sm => !this.circuitBreaker.isOpen(sm.model.name));
    if (fallback) return fallback.model;
    
    throw new Error("Failover Exhausted: All available models are currently in an OPEN circuit (Cooldown) state.");
  }
  
  private scoreModel(m: AIModel, preferredModel?: string): number {
    let score = 0;
    const name = m.name.toLowerCase();
    
    // 1. Base Type Scoring
    if (name.includes("pro")) score += 20;
    if (name.includes("flash")) score += 10;
    if (name.includes("latest")) score -= 10;
    if (name.includes("preview") || name.includes("exp")) score -= 50;
    
    const versionMatch = name.match(/gemini-(\d+\.\d+)/);
    if (versionMatch) {
      score += parseFloat(versionMatch[1]) * 10;
    }
    
    // 2. Health Metrics
    const h = this.healthManager.getHealth(m.name);
    if (h.totalRequests > 0) {
      const successRate = h.successCount / h.totalRequests;
      score += successRate * 50; // up to +50 for 100% success
      
      const failRate = h.failureCount / h.totalRequests;
      score -= failRate * 100; // heavy penalty for failures
    }
    
    // 3. Circuit Breaker State Penalty
    if (h.state === "HALF_OPEN") score -= 30; // Risky to use HALF_OPEN as primary if others are fully healthy
    
    // 4. Token Limits & Thinking (Capability)
    if (m.thinking) score += 5;
    if (m.outputTokenLimit > 8000) score += 5;
    
    // 5. Admin Preference Overrides Everything if Healthy
    if (preferredModel && m.name === preferredModel) {
      score += 1000;
    }
    
    return score;
  }
}
