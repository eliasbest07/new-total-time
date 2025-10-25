/**
 * Utility to track and debug auth calls to identify rate limiting sources
 */

interface AuthCall {
  timestamp: number;
  source: string;
  method: string;
  stackTrace?: string;
}

class AuthCallTracker {
  private calls: AuthCall[] = [];
  private readonly maxHistory = 50;

  trackCall(source: string, method: string = 'unknown') {
    const call: AuthCall = {
      timestamp: Date.now(),
      source,
      method,
      stackTrace: new Error().stack
    };

    this.calls.push(call);
    
    // Keep only recent calls
    if (this.calls.length > this.maxHistory) {
      this.calls = this.calls.slice(-this.maxHistory);
    }

    // Log if too many calls in short period
    const recentCalls = this.getRecentCalls(5000); // Last 5 seconds
    if (recentCalls.length > 5) {
      console.warn('⚠️ Muchas llamadas de auth en poco tiempo:', {
        count: recentCalls.length,
        sources: recentCalls.map(c => c.source),
        methods: recentCalls.map(c => c.method)
      });
    }
  }

  getRecentCalls(timeWindowMs: number = 10000): AuthCall[] {
    const cutoff = Date.now() - timeWindowMs;
    return this.calls.filter(call => call.timestamp > cutoff);
  }

  getCallsBySource(): Record<string, number> {
    const recentCalls = this.getRecentCalls();
    const counts: Record<string, number> = {};
    
    recentCalls.forEach(call => {
      counts[call.source] = (counts[call.source] || 0) + 1;
    });
    
    return counts;
  }

  logSummary() {
    const recentCalls = this.getRecentCalls();
    const callsBySource = this.getCallsBySource();
    
    console.log('📊 Auth Calls Summary (last 10s):', {
      totalCalls: recentCalls.length,
      callsBySource,
      timeline: recentCalls.map(c => ({
        time: new Date(c.timestamp).toLocaleTimeString(),
        source: c.source,
        method: c.method
      }))
    });
  }

  clear() {
    this.calls = [];
  }
}

export const authCallTracker = new AuthCallTracker();

// Helper function to track auth calls
export function trackAuthCall(source: string, method: string = 'unknown') {
  if (process.env.NODE_ENV === 'development') {
    authCallTracker.trackCall(source, method);
  }
}

// Log summary every 30 seconds in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const recentCalls = authCallTracker.getRecentCalls();
    if (recentCalls.length > 0) {
      authCallTracker.logSummary();
    }
  }, 30000);
}