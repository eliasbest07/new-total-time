/**
 * Simple request queue to prevent too many simultaneous requests
 * Helps avoid rate limiting by spacing out requests
 */

interface QueuedRequest<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private readonly maxConcurrent = 2; // Maximum concurrent requests
  private readonly minInterval = 500; // Minimum interval between requests (ms)
  private lastRequestTime = 0;
  private activeRequests = 0;

  async enqueue<T>(
    operation: () => Promise<T>,
    id: string = Math.random().toString(36),
    priority: number = 0
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id,
        operation,
        resolve,
        reject,
        priority
      });

      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.processing = true;
    this.activeRequests++;

    try {
      // Ensure minimum interval between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minInterval) {
        await new Promise(resolve => 
          setTimeout(resolve, this.minInterval - timeSinceLastRequest)
        );
      }

      this.lastRequestTime = Date.now();
      const result = await request.operation();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      this.processing = false;
      
      // Process next request if any
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

// Global request queue instance
export const globalRequestQueue = new RequestQueue();

/**
 * Wrapper function to queue Supabase operations
 */
export async function queueSupabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Supabase operation',
  priority: number = 0
): Promise<T> {
  return globalRequestQueue.enqueue(
    operation,
    `${operationName}-${Date.now()}`,
    priority
  );
}