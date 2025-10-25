/**
 * Utility function to retry operations with exponential backoff
 * Useful for handling rate limiting and temporary failures
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Si es un error de rate limiting (429), usar un delay más largo
      const isRateLimit = lastError.message.includes('429') || 
                         lastError.message.includes('Too Many Requests');
      
      const delay = isRateLimit 
        ? Math.min(baseDelay * Math.pow(2, attempt + 1), maxDelay) // Backoff más agresivo para rate limits
        : Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      console.warn(`⚠️ Intento ${attempt + 1} falló, reintentando en ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Wrapper específico para operaciones de Supabase que pueden sufrir rate limiting
 */
export async function retrySupabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string = 'Supabase operation'
): Promise<T> {
  return retryWithBackoff(
    operation,
    3, // máximo 3 reintentos
    2000, // empezar con 2 segundos
    30000 // máximo 30 segundos
  ).catch(error => {
    console.error(`❌ ${operationName} falló después de todos los reintentos:`, error);
    throw error;
  });
}