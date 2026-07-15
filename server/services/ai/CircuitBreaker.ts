import { HealthManager } from "./HealthManager";

export class CircuitBreaker {
  constructor(private healthManager: HealthManager) {}
  
  isOpen(modelName: string): boolean {
    const h = this.healthManager.getHealth(modelName);
    if (h.state === "OPEN") {
      if (h.cooldownUntil && new Date() > h.cooldownUntil) {
        h.state = "HALF_OPEN";
        h.cooldownUntil = null;
        return false; // allow one test request
      }
      return true;
    }
    return false;
  }
  
  markFailure(modelName: string, cooldownMins: number) {
    const h = this.healthManager.getHealth(modelName);
    h.state = "OPEN";
    h.cooldownUntil = new Date(Date.now() + cooldownMins * 60000);
  }
  
  markSuccess(modelName: string) {
    const h = this.healthManager.getHealth(modelName);
    h.state = "CLOSED";
    h.cooldownUntil = null;
  }
}
