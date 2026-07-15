import prisma from "../../lib/prisma";

export interface ModelHealth {
  modelName: string;
  provider: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  failoverCount: number;
  avgLatencyMs: number;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  cooldownUntil: Date | null;
}

export class HealthManager {
  private healthMap = new Map<string, ModelHealth>();
  
  async init() {
    try {
      const records = await prisma.aIModelAnalytics.findMany();
      for (const r of records) {
        this.healthMap.set(r.modelName, {
          modelName: r.modelName,
          provider: r.provider,
          totalRequests: r.totalRequests,
          successCount: r.successCount,
          failureCount: r.failureCount,
          failoverCount: r.failoverCount,
          avgLatencyMs: r.avgLatencyMs,
          lastSuccess: r.lastSuccess,
          lastFailure: r.lastFailure,
          state: "CLOSED",
          cooldownUntil: null
        });
      }
    } catch (e) {
      console.warn("Failed to load AI analytics from DB", e);
    }
  }
  
  getHealth(modelName: string, provider: string = "gemini"): ModelHealth {
    if (!this.healthMap.has(modelName)) {
      this.healthMap.set(modelName, {
        modelName,
        provider,
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        failoverCount: 0,
        avgLatencyMs: 0,
        lastSuccess: null,
        lastFailure: null,
        state: "CLOSED",
        cooldownUntil: null
      });
    }
    return this.healthMap.get(modelName)!;
  }
  
  getAllHealth(): ModelHealth[] {
    return Array.from(this.healthMap.values());
  }
  
  async recordSuccess(modelName: string, latencyMs: number) {
    const h = this.getHealth(modelName);
    h.totalRequests++;
    h.successCount++;
    h.avgLatencyMs = ((h.avgLatencyMs * (h.successCount - 1)) + latencyMs) / h.successCount;
    h.lastSuccess = new Date();
    await this.persist(modelName);
  }
  
  async recordFailure(modelName: string) {
    const h = this.getHealth(modelName);
    h.totalRequests++;
    h.failureCount++;
    h.lastFailure = new Date();
    await this.persist(modelName);
  }
  
  async recordFailover(modelName: string) {
    const h = this.getHealth(modelName);
    h.failoverCount++;
    await this.persist(modelName);
  }
  
  private async persist(modelName: string) {
    const h = this.healthMap.get(modelName);
    if (!h) return;
    try {
      await prisma.aIModelAnalytics.upsert({
        where: { modelName },
        update: {
          totalRequests: h.totalRequests,
          successCount: h.successCount,
          failureCount: h.failureCount,
          failoverCount: h.failoverCount,
          avgLatencyMs: h.avgLatencyMs,
          lastSuccess: h.lastSuccess,
          lastFailure: h.lastFailure
        },
        create: {
          modelName,
          provider: h.provider,
          totalRequests: h.totalRequests,
          successCount: h.successCount,
          failureCount: h.failureCount,
          failoverCount: h.failoverCount,
          avgLatencyMs: h.avgLatencyMs,
          lastSuccess: h.lastSuccess,
          lastFailure: h.lastFailure
        }
      });
    } catch (e) {
      console.warn(`Failed to persist analytics for ${modelName}`, e);
    }
  }
}
