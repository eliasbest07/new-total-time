import { Usuario } from '@/domain/entities/Usuario';

export class StorageService {
  private static readonly USER_KEY = 'usuario';
  private static readonly TIMESTAMP_KEY = 'usuario_timestamp';
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  static saveUser(usuario: Usuario): void {
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(usuario));
      localStorage.setItem(this.TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  }

  static getUser(): Usuario | null {
    try {
      const storedUser = localStorage.getItem(this.USER_KEY);
      if (!storedUser) return null;

      const userData = JSON.parse(storedUser);
      
      // Recrear el objeto Usuario con sus métodos
      return new Usuario(
        userData.id,
        userData.email,
        userData.role,
        userData.profile,
        userData.barraSalud,
        userData.userAuth,
        userData.admin,
        userData.idOrganizacion,
        userData.permisos,
        new Date(userData.ultimaActividad),
        userData.ultimaCaptura,
        userData.solicitudNivel
      );
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
      this.clearUser(); // Limpiar datos corruptos
      return null;
    }
  }

  static clearUser(): void {
    try {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.TIMESTAMP_KEY);
    } catch (error) {
      console.error('Error clearing user from localStorage:', error);
    }
  }

  static hasUser(): boolean {
    try {
      return localStorage.getItem(this.USER_KEY) !== null;
    } catch (error) {
      return false;
    }
  }

  static isUserDataFresh(): boolean {
    try {
      const timestamp = localStorage.getItem(this.TIMESTAMP_KEY);
      if (!timestamp) return false;
      
      const savedTime = parseInt(timestamp);
      const now = Date.now();
      
      return (now - savedTime) < this.CACHE_DURATION;
    } catch (error) {
      return false;
    }
  }
}