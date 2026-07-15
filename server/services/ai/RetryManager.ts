import { AIProvider } from "./AITypes";

export class RetryManager {
  
  // Returns true if the error is a temporary issue that should be retried ON THE SAME MODEL
  public static isRecoverableSameModel(err: any): boolean {
    const msg = err.message?.toLowerCase() || "";
    const status = err.status || err.response?.status;
    
    if (status === 500 || status === 503) return true;
    if (msg.includes("timeout") || msg.includes("econnreset") || msg.includes("network")) return true;
    
    return false;
  }
  
  // Returns true if the error means we MUST immediately failover to another model
  public static isImmediateFailover(err: any): boolean {
    const msg = err.message?.toLowerCase() || "";
    const status = err.status || err.response?.status;
    
    if (status === 429) return true;
    if (msg.includes("quota") || msg.includes("exhausted") || msg.includes("too many requests")) return true;
    if (msg.includes("not found") || msg.includes("deprecated") || status === 404) return true;
    
    return false;
  }

  // Returns true if the error is a user/prompt error that should NOT be retried
  public static isUserError(err: any): boolean {
    const status = err.status || err.response?.status;
    if (status === 400) return true;
    return false;
  }

  public static async sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
