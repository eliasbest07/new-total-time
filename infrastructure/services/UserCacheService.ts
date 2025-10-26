import { supabase } from './SupabaseClient';
import { requestCache } from './RequestCache';


/**
 * Datos básicos de usuario para mostrar en posts, comentarios, mensajes, etc.
 */
export interface BasicUserData {
  id?: number;
  id_usuario?: string; // UUID de Supabase
  user_auth?: string; // UUID alternativo
  nombre?: string;
  avatar?: string;
  username?: string;
  correo?: string;
  marco?: string;
}

/**
 * Servicio singleton de caché de usuarios
 * Evita consultas duplicadas a Supabase y mantiene usuarios en memoria
 */
class UserCacheService {
  private static instance: UserCacheService;
  private cache: Map<string, BasicUserData> = new Map();
  private requestCache = requestCache;

  // TTL por defecto: 10 minutos
  private readonly DEFAULT_TTL = 10 * 60 * 1000;

  private constructor() {
    // La instancia de requestCache ya está inicializada
  }

  public static getInstance(): UserCacheService {
    if (!UserCacheService.instance) {
      UserCacheService.instance = new UserCacheService();
    }
    return UserCacheService.instance;
  }

  /**
   * Obtiene múltiples usuarios por sus IDs (id_usuario UUID)
   * Utiliza caché para evitar consultas duplicadas
   */
  public async getUsersByIdUsuario(userIds: string[]): Promise<Map<string, BasicUserData>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    // Filtrar IDs únicos y válidos (solo strings no vacíos)
    const uniqueIds = [...new Set(
      userIds.filter(id => id && typeof id === 'string' && id.trim().length > 0)
    )];

    if (uniqueIds.length === 0) {
      console.warn('⚠️ [UserCacheService] getUsersByIdUsuario: No hay IDs válidos');
      return new Map();
    }

    // Verificar cuáles ya están en caché
    const cachedUsers = new Map<string, BasicUserData>();
    const missingIds: string[] = [];

    uniqueIds.forEach(id => {
      const cached = this.cache.get(`id_usuario:${id}`);
      if (cached) {
        cachedUsers.set(id, cached);
      } else {
        missingIds.push(id);
      }
    });

    // Si todos están en caché, retornar inmediatamente
    if (missingIds.length === 0) {
      // console.log(`✅ [UserCacheService] ${uniqueIds.length} usuarios encontrados en caché`);
      return cachedUsers;
    }

    console.log(`🔍 [UserCacheService] Consultando ${missingIds.length} usuarios faltantes por ID numérico`);

    // Consultar los faltantes usando RequestCache para evitar duplicados
    const cacheKey = `users-batch-${missingIds.sort().join(',')}`;

    try {
      const fetchedUsers = await this.requestCache.execute<BasicUserData[]>(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('usuario')
            .select('id, id_usuario, nombre, avatar, username, correo, marco, user_auth')
            .in('id_usuario', missingIds);

          if (error) {
            console.error('❌ [UserCacheService] Error de Supabase:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            return [];
          }

          if (!data || data.length === 0) {
            console.warn('⚠️ [UserCacheService] No se encontraron usuarios para', missingIds.length, 'IDs');
          } else {
            console.log(`✅ [UserCacheService] ${data.length} usuarios obtenidos de Supabase`);
          }

          return data || [];
        },
        this.DEFAULT_TTL
      );

      // Guardar en caché local
      fetchedUsers.forEach((user: BasicUserData) => {
        if (user.id_usuario) {
          this.cache.set(`id_usuario:${user.id_usuario}`, user);
          cachedUsers.set(user.id_usuario, user);
        }
      });

      return cachedUsers;
    } catch (error) {
      console.error('❌ [UserCacheService] Excepción en getUsersByIdUsuario:', error);
      return cachedUsers; // Retornar al menos los cacheados
    }
  }

  /**
   * Obtiene múltiples usuarios por sus IDs numéricos (id)
   */
  public async getUsersById(userIds: number[]): Promise<Map<number, BasicUserData>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    // Filtrar IDs válidos (números positivos)
    const uniqueIds = [...new Set(
      userIds.filter(id => id !== null && id !== undefined && typeof id === 'number' && id > 0)
    )];

    if (uniqueIds.length === 0) {
      console.warn('⚠️ [UserCacheService] getUsersById: No hay IDs válidos');
      return new Map();
    }

    const cachedUsers = new Map<number, BasicUserData>();
    const missingIds: number[] = [];

    uniqueIds.forEach(id => {
      const cached = this.cache.get(`id:${id}`);
      if (cached && cached.id) {
        cachedUsers.set(id, cached);
      } else {
        missingIds.push(id);
      }
    });

    if (missingIds.length === 0) {
      // console.log(`✅ [UserCacheService] ${uniqueIds.length} usuarios encontrados en caché (por ID)`);
      return cachedUsers;
    }

    console.log(`🔍 [UserCacheService] Consultando ${missingIds.length} usuarios faltantes por ID`);

    const cacheKey = `users-batch-id-${missingIds.sort().join(',')}`;

    try {
      const fetchedUsers = await this.requestCache.execute<BasicUserData[]>(
        cacheKey,
        async () => {
          const { data, error } = await supabase
            .from('usuario')
            .select('id, id_usuario, nombre, avatar, username, correo, marco, user_auth')
            .in('id', missingIds);

          if (error) {
            console.error('❌ [UserCacheService] Error de Supabase (por ID):', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            return [];
          }

          if (!data || data.length === 0) {
            console.warn('⚠️ [UserCacheService] No se encontraron usuarios para', missingIds.length, 'IDs numéricos');
          } else {
            console.log(`✅ [UserCacheService] ${data.length} usuarios obtenidos de Supabase (por ID)`);
          }

          return data || [];
        },
        this.DEFAULT_TTL
      );

      fetchedUsers.forEach((user: BasicUserData) => {
        if (user.id) {
          this.cache.set(`id:${user.id}`, user);
          cachedUsers.set(user.id, user);
        }
        // También cachear por id_usuario si existe
        if (user.id_usuario) {
          this.cache.set(`id_usuario:${user.id_usuario}`, user);
        }
      });

      return cachedUsers;
    } catch (error) {
      console.error('❌ [UserCacheService] Excepción en getUsersById:', error);
      return cachedUsers;
    }
  }

  /**
   * Obtiene un único usuario por user_auth (usado en mensajes)
   * Intenta con user_auth, luego id_usuario, luego id
   */
  public async getUserByAuth(authId: string): Promise<BasicUserData | null> {
    if (!authId || typeof authId !== 'string') {
      console.warn('⚠️ [UserCacheService] getUserByAuth: authId inválido:', authId);
      return null;
    }

    // Verificar caché
    const cached = this.cache.get(`auth:${authId}`);
    if (cached) {
      // console.log(`✅ [UserCacheService] Usuario encontrado en caché (auth): ${cached.nombre}`);
      return cached;
    }

    // console.log(`🔍 [UserCacheService] Buscando usuario por auth: ${authId}`);

    const cacheKey = `user-auth-${authId}`;

    try {
      const user = await this.requestCache.execute<BasicUserData | null>(
        cacheKey,
        async () => {
          // Intentar con user_auth
          let { data, error } = await supabase
            .from('usuario')
            .select('id, id_usuario, nombre, avatar, username, correo, marco, user_auth')
            .eq('user_auth', authId)
            .maybeSingle();

          if (error) {
            console.error('❌ [UserCacheService] Error buscando por user_auth:', {
              message: error.message,
              details: error.details,
              hint: error.hint
            });
          }

          if (data) {
            // console.log(`✅ [UserCacheService] Usuario encontrado por user_auth: ${data.nombre}`);
            return data;
          }

          // Intentar con id_usuario
          // console.log('🔍 [UserCacheService] Intentando con id_usuario...');
          const result2 = await supabase
            .from('usuario')
            .select('id, id_usuario, nombre, avatar, username, correo, marco, user_auth')
            .eq('id_usuario', authId)
            .maybeSingle();

          if (result2.error) {
            console.error('❌ [UserCacheService] Error buscando por id_usuario:', {
              message: result2.error.message
            });
          }

          if (result2.data) {
            // console.log(`✅ [UserCacheService] Usuario encontrado por id_usuario: ${result2.data.nombre}`);
            return result2.data;
          }

          // Intentar con id (si es numérico)
          if (!isNaN(Number(authId))) {
            // console.log('🔍 [UserCacheService] Intentando con id numérico...');
            const result3 = await supabase
              .from('usuario')
              .select('id, id_usuario, nombre, avatar, username, correo, marco, user_auth')
              .eq('id', Number(authId))
              .maybeSingle();

            if (result3.error) {
              console.error('❌ [UserCacheService] Error buscando por id:', {
                message: result3.error.message
              });
            }

            if (result3.data) {
              // console.log(`✅ [UserCacheService] Usuario encontrado por id: ${result3.data.nombre}`);
              return result3.data;
            }
          }

          console.warn(`⚠️ [UserCacheService] No se encontró usuario para authId: ${authId}`);
          return null;
        },
        this.DEFAULT_TTL
      );

      if (user) {
        // Guardar en múltiples claves para acelerar búsquedas futuras
        this.cache.set(`auth:${authId}`, user);
        if (user.id) this.cache.set(`id:${user.id}`, user);
        if (user.id_usuario) this.cache.set(`id_usuario:${user.id_usuario}`, user);
        if (user.user_auth) this.cache.set(`auth:${user.user_auth}`, user);
        // console.log(`💾 [UserCacheService] Usuario cacheado: ${user.nombre}`);
      }

      return user;
    } catch (error) {
      console.error('❌ [UserCacheService] Excepción en getUserByAuth:', error);
      return null;
    }
  }

  /**
   * Pre-carga usuarios desde un contexto existente (ej: UsuariosOrganizacionContext)
   * Esto evita consultas innecesarias si ya tenemos los datos
   */
  public preloadUsers(users: BasicUserData[]): void {
    if (!users || users.length === 0) {
      console.warn('⚠️ [UserCacheService] preloadUsers: Array vacío');
      return;
    }

    let preloadedCount = 0;
    users.forEach(user => {
      if (user.id) this.cache.set(`id:${user.id}`, user);
      if (user.id_usuario) this.cache.set(`id_usuario:${user.id_usuario}`, user);
      if (user.user_auth) this.cache.set(`auth:${user.user_auth}`, user);
      preloadedCount++;
    });

    console.log(`💾 [UserCacheService] ${preloadedCount} usuarios pre-cargados en caché`);
  }

  /**
   * Invalida el caché de un usuario específico
   */
  public invalidateUser(userId: string | number): void {
    if (typeof userId === 'number') {
      this.cache.delete(`id:${userId}`);
    } else {
      this.cache.delete(`id_usuario:${userId}`);
      this.cache.delete(`auth:${userId}`);
    }
  }

  /**
   * Limpia todo el caché (útil al hacer logout)
   */
  public clearAll(): void {
    this.cache.clear();
    console.log('🗑️ [UserCacheService] Caché limpiado');
  }

  /**
   * Obtiene estadísticas del caché (para debugging)
   */
  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Exportar instancia singleton
export const userCacheService = UserCacheService.getInstance();
