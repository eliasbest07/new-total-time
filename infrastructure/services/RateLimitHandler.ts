/**
 * Servicio para manejar rate limiting (429) y evitar loops de refresh token
 */
class RateLimitHandler {
  private rateLimitCooldown: number | null = null;
  private readonly COOLDOWN_DURATION = 60 * 1000; // 60 segundos de cooldown después de un 429
  private isInCooldown = false;

  /**
   * Verifica si estamos en cooldown después de un error 429
   */
  isRateLimited(): boolean {
    if (!this.rateLimitCooldown) {
      return false;
    }

    const now = Date.now();
    if (now - this.rateLimitCooldown > this.COOLDOWN_DURATION) {
      // Cooldown expirado
      this.rateLimitCooldown = null;
      this.isInCooldown = false;
      return false;
    }

    return true;
  }

  /**
   * Registra un error 429 y activa el cooldown
   */
  handleRateLimitError(): void {
    console.warn('⚠️ [RateLimitHandler] Error 429 detectado, activando cooldown de 60 segundos');
    this.rateLimitCooldown = Date.now();
    this.isInCooldown = true;
  }

  /**
   * Obtiene el tiempo restante del cooldown en milisegundos
   */
  getRemainingCooldown(): number {
    if (!this.rateLimitCooldown) {
      return 0;
    }

    const now = Date.now();
    const elapsed = now - this.rateLimitCooldown;
    const remaining = this.COOLDOWN_DURATION - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Limpia el cooldown manualmente
   */
  clearCooldown(): void {
    this.rateLimitCooldown = null;
    this.isInCooldown = false;
  }

  /**
   * Verifica si un error es un error 429
   */
  isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString() || '';
    const errorCode = error.code || error.status || error.statusCode || '';
    
    return (
      errorMessage.includes('429') ||
      errorMessage.includes('Too Many Requests') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('Request rate limit reached') ||
      errorCode === 429 ||
      errorCode === '429'
    );
  }
}

export const rateLimitHandler = new RateLimitHandler();

