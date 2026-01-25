import { supabase } from "@/infrastructure/services/SupabaseClient";
import { MisionRepository } from "@/infrastructure/repositories/MisionRepository";
import { Mision, MisionWithTodos } from "@/domain/entities/Mision";
import { CardDB } from "@/domain/entities/Card";
import { CardTodo } from "@/domain/entities/CardTodo";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeCallbacks {
  onMisionesUpdated: (misiones: MisionWithTodos[]) => void;
  onError: (error: string) => void;
}

export class SupabaseMisionRepository implements MisionRepository {
  private reconnectAttempts: Map<string, number> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();
  private maxReconnectAttempts = 5; // Máximo 5 intentos
  private baseReconnectDelay = 5000; // 5 segundos inicial
  private maxReconnectDelay = 60000; // 60 segundos máximo
  private silentMode = true; // Modo silencioso para reducir logs

  async getAllMisiones(): Promise<MisionWithTodos[]> {
    try {
      // console.log('🎯 Obteniendo todas las misiones');

      const { data, error } = await supabase
        .from('misiones')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo todas las misiones:', error);
        return [];
      }

      const misiones = data || [];
      // console.log('✅ Todas las misiones encontradas:', misiones.length);

      // Cargar los card_todos
      const misionesWithTodos = await this.loadCardTodosForMisiones(misiones);
      return misionesWithTodos;
    } catch (error) {
      console.error('❌ Error en getAllMisiones:', error);
      return [];
    }
  }

  async getMisionesByUsuario(idUsuario: number): Promise<MisionWithTodos[]> {
    try {
      // console.log('🎯 Obteniendo misiones para usuario:', idUsuario);
      // console.log('🎯 Tipo de idUsuario:', typeof idUsuario);

      const { data, error } = await supabase
        .from('misiones')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('created_at', { ascending: false });

      // console.log('🎯 Respuesta de Supabase misiones:', { data, error });

      if (error) {
        console.error('❌ Error obteniendo misiones:', error);
        console.error('❌ Detalles del error:', error.message, error.code, error.details);
        return [];
      }

      const misiones = data || [];
      // console.log('✅ Misiones encontradas:', misiones.length);
      // console.log('✅ Misiones data:', misiones);

      // Cargar los card_todos
      const misionesWithTodos = await this.loadCardTodosForMisiones(misiones);
      return misionesWithTodos;
    } catch (error) {
      console.error('❌ Error en getMisionesByUsuario:', error);
      return [];
    }
  }

  /**
   * Método auxiliar para cargar los card_todos de las misiones
   */
  private async loadCardTodosForMisiones(misiones: Mision[]): Promise<MisionWithTodos[]> {
    try {
      // Extraer todos los UUIDs únicos de card_todos
      const allCardIds = new Set<string>();
      misiones.forEach(mision => {
        if (mision.card_todos && Array.isArray(mision.card_todos)) {
          mision.card_todos.forEach(id => allCardIds.add(id));
        }
      });

      if (allCardIds.size === 0) {
        // No hay card_todos, retornar misiones tal cual
        return misiones.map(m => ({ ...m, cardTodosData: [] }));
      }

      const cardIdsArray = Array.from(allCardIds);

      // Obtener todos los cards con sus todos en una sola consulta
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select(`
          *,
          card_todos (*)
        `)
        .in('id', cardIdsArray);

      if (cardsError) {
        console.error('❌ Error obteniendo cards:', cardsError);
        return misiones.map(m => ({ ...m, cardTodosData: [] }));
      }

      // Crear un mapa de card id -> {card, todos}
      const cardsMap = new Map<string, { card: CardDB; todos: CardTodo[] }>();
      (cardsData || []).forEach((card: any) => {
        cardsMap.set(card.id, {
          card: card as CardDB,
          todos: (card.card_todos || []) as CardTodo[]
        });
      });

      // Mapear las misiones con sus card_todos
      const misionesWithTodos: MisionWithTodos[] = misiones.map(mision => {
        const cardTodosData: Array<{card: CardDB; todos: CardTodo[]}> = [];

        if (mision.card_todos && Array.isArray(mision.card_todos)) {
          mision.card_todos.forEach(cardId => {
            const cardData = cardsMap.get(cardId);
            if (cardData) {
              // Ordenar los todos por position
              const sortedTodos = [...cardData.todos].sort((a, b) => a.position - b.position);
              cardTodosData.push({
                card: cardData.card,
                todos: sortedTodos
              });
            }
          });
        }

        return {
          ...mision,
          cardTodosData
        };
      });

      return misionesWithTodos;
    } catch (error) {
      console.error('❌ Error en loadCardTodosForMisiones:', error);
      return misiones.map(m => ({ ...m, cardTodosData: [] }));
    }
  }

  async getMisionesByUsuarios(idsUsuarios: number[]): Promise<MisionWithTodos[]> {
    try {
      if (idsUsuarios.length === 0) {
        return [];
      }

      // console.log('🎯 Obteniendo misiones para usuarios:', idsUsuarios);

      const { data, error } = await supabase
        .from('misiones')
        .select('*')
        .in('id_usuario', idsUsuarios)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error obteniendo misiones de usuarios:', error);
        return [];
      }

      const misiones = data || [];
      // console.log('✅ Misiones de usuarios encontradas:', misiones.length);

      // Cargar los card_todos
      const misionesWithTodos = await this.loadCardTodosForMisiones(misiones);
      return misionesWithTodos;
    } catch (error) {
      console.error('❌ Error en getMisionesByUsuarios:', error);
      return [];
    }
  }

  async createMision(mision: Omit<Mision, 'id' | 'created_at'>): Promise<Mision | null> {
    try {
      // console.log('➕ Creando nueva misión:', mision);

      const { data, error } = await supabase
        .from('misiones')
        .insert([mision])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creando misión:', error);
        return null;
      }

      // console.log('✅ Misión creada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en createMision:', error);
      return null;
    }
  }

  async updateMision(id: number, mision: Partial<Mision>): Promise<Mision | null> {
    try {
      console.log('✏️ Intentando actualizar misión:', { id, tipo_id: typeof id, campos: Object.keys(mision) });

      // Primero verificar si la misión existe y es accesible
      const { data: existingMision, error: checkError } = await supabase
        .from('misiones')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (checkError) {
        console.error('❌ Error verificando existencia de misión:', checkError);
        return null;
      }

      if (!existingMision) {
        console.warn('⚠️ La misión no existe o no es accesible (ID:', id, ')');
        console.warn('💡 Posibles causas: 1) La misión fue eliminada, 2) Políticas RLS bloquean el acceso, 3) El ID es incorrecto');
        return null;
      }

      console.log('✅ Misión encontrada, procediendo con actualización');

      const { data, error } = await supabase
        .from('misiones')
        .update(mision)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ No se pudo actualizar la misión (ID:', id, ')');
          console.warn('💡 Posible causa: Políticas RLS bloquean la actualización');
        } else {
          console.error('❌ Error actualizando misión:', error);
        }
        return null;
      }

      console.log('✅ Misión actualizada exitosamente:', data);
      return data;
    } catch (error) {
      console.error('❌ Error inesperado en updateMision:', error);
      return null;
    }
  }

  async deleteMision(id: number): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando misión:', id);

      // 0. Verificar cuántas misiones activas existen para este id_referencia
      const { data: existingActivas, error: checkError } = await supabase
        .from('misiones_activas')
        .select('id, tipo, id_referencia, id_usuario_asignado')
        .eq('tipo', 'mision')
        .eq('id_referencia', id);

      if (checkError) {
        console.error('❌ Error verificando misiones activas:', checkError);
      } else {
        console.log('📋 Misiones activas encontradas para eliminar:', existingActivas?.length || 0, existingActivas);
      }

      // 1. Primero eliminar las misiones activas relacionadas usando sus IDs específicos
      if (existingActivas && existingActivas.length > 0) {
        const idsToDelete = existingActivas.map(ma => ma.id);
        console.log('🗑️ Paso 1: Eliminando misiones activas con IDs:', idsToDelete);

        // Eliminar una por una para mayor control
        for (const misionActivaId of idsToDelete) {
          console.log('🗑️ Eliminando mision_activa:', misionActivaId);
          const { error: deleteError, count } = await supabase
            .from('misiones_activas')
            .delete()
            .eq('id', misionActivaId)
            .select();

          if (deleteError) {
            console.error('❌ Error eliminando mision_activa', misionActivaId, ':', deleteError);
            // Intentar con RPC si el delete directo falla
          } else {
            console.log('✅ Mision_activa eliminada:', misionActivaId);
          }
        }

        // Verificar si realmente se eliminaron
        const { data: remaining, error: verifyError } = await supabase
          .from('misiones_activas')
          .select('id')
          .eq('tipo', 'mision')
          .eq('id_referencia', id);

        if (remaining && remaining.length > 0) {
          console.error('❌ Aún quedan', remaining.length, 'misiones_activas sin eliminar. RLS puede estar bloqueando.');
          console.error('💡 Verifica las políticas RLS de la tabla misiones_activas en Supabase');
          return false;
        }
        console.log('✅ Todas las misiones activas eliminadas correctamente');
      } else {
        console.log('ℹ️ No hay misiones activas que eliminar');
      }

      // 2. Ahora eliminar la misión
      console.log('🗑️ Paso 2: Eliminando misión de tabla misiones');
      const { error } = await supabase
        .from('misiones')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error eliminando misión:', error);
        return false;
      }

      console.log('✅ Misión eliminada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteMision:', error);
      return false;
    }
  }

  async getMisionById(id: number): Promise<Mision | null> {
    try {
      // console.log('🔍 Obteniendo misión por ID:', id);

      const { data, error } = await supabase
        .from('misiones')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error obteniendo misión:', error);
        return null;
      }

      // console.log('✅ Misión encontrada:', data);
      return data;
    } catch (error) {
      console.error('❌ Error en getMisionById:', error);
      return null;
    }
  }

  // Suscribirse a cambios en tiempo real de todas las misiones
  subscribeToAllMisionesChanges(callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = 'misiones-all';

    // Si ya existe un canal activo, retornarlo
    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      if (!this.silentMode) console.log('♻️ Reutilizando canal realtime misiones');
      return existingChannel;
    }

    if (!this.silentMode) console.log('📡 Iniciando suscripción realtime para todas las misiones');

    const setupChannel = (): RealtimeChannel => {
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'misiones'
          },
          async (payload) => {
            // console.log('📡 Cambio detectado en misiones:', payload);

            try {
              const nuevasMisiones = await this.getAllMisiones();

              callbacks.onMisionesUpdated(nuevasMisiones);
            } catch (error) {
              console.error('❌ Error procesando cambio de misiones:', error);
              callbacks.onError('Error al procesar cambios de misiones');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (!this.silentMode) console.log('✅ Suscripción realtime misiones activa');
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              if (!this.silentMode) console.warn(`⚠️ Error en canal misiones (${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToAllMisionesChanges(callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime misiones: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToAllMisionesChanges(callbacks), callbacks);
            }
          }
        });

      return channel;
    };

    const newChannel = setupChannel();
    this.activeChannels.set(channelName, newChannel);
    return newChannel;
  }

  // Suscribirse a cambios en tiempo real de misiones de múltiples usuarios
  subscribeToMisionesChangesByUsuarios(idsUsuarios: number[], callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = `misiones-usuarios-${idsUsuarios.sort().join('-')}`;

    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      if (!this.silentMode) console.log('♻️ Reutilizando canal realtime misiones usuarios');
      return existingChannel;
    }

    if (!this.silentMode) console.log('📡 Iniciando suscripción realtime para misiones de usuarios:', idsUsuarios);

    const setupChannel = (): RealtimeChannel => {
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'misiones'
          },
          async (payload) => {
            // console.log('📡 Cambio detectado en misiones:', payload);

            try {
              // Recargar misiones de todos los usuarios
              const nuevasMisiones = await this.getMisionesByUsuarios(idsUsuarios);
              callbacks.onMisionesUpdated(nuevasMisiones);
            } catch (error) {
              console.error('❌ Error procesando cambio de misiones:', error);
              callbacks.onError('Error al procesar cambios de misiones');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (!this.silentMode) console.log('✅ Suscripción realtime misiones usuarios activa');
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              if (!this.silentMode) console.warn(`⚠️ Error en canal misiones usuarios (${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToMisionesChangesByUsuarios(idsUsuarios, callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime misiones usuarios: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToMisionesChangesByUsuarios(idsUsuarios, callbacks), callbacks);
            }
          }
        });

      return channel;
    };

    const newChannel = setupChannel();
    this.activeChannels.set(channelName, newChannel);
    return newChannel;
  }

  // Suscribirse a cambios en tiempo real de misiones del usuario
  subscribeToMisionesChanges(idUsuario: number, callbacks: RealtimeCallbacks): RealtimeChannel {
    const channelName = `misiones-usuario-${idUsuario}`;

    const existingChannel = this.activeChannels.get(channelName);
    if (existingChannel) {
      if (!this.silentMode) console.log('♻️ Reutilizando canal realtime misiones usuario');
      return existingChannel;
    }

    if (!this.silentMode) console.log('📡 Iniciando suscripción realtime para misiones del usuario:', idUsuario);

    const setupChannel = (): RealtimeChannel => {
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'misiones'
            // Sin filtro para detectar asignaciones y desasignaciones
          },
          async (payload) => {
            console.log('📡 [REPO] Cambio detectado, recargando para user:', idUsuario);

            try {
              const nuevasMisiones = await this.getMisionesByUsuario(idUsuario);
              console.log('📡 [REPO] Recargadas:', nuevasMisiones.length);
              callbacks.onMisionesUpdated(nuevasMisiones);
            } catch (error) {
              console.error('❌ Error procesando cambio de misiones:', error);
              callbacks.onError('Error al procesar cambios de misiones');
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            if (!this.silentMode) console.log('✅ Suscripción realtime misiones usuario activa');
            this.reconnectAttempts.set(channelName, 0);
            this.activeChannels.set(channelName, channel);
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              if (!this.silentMode) console.warn(`⚠️ Error en canal misiones usuario (${attempts + 1}/${this.maxReconnectAttempts})`);
              this.activeChannels.delete(channelName);
              this.handleReconnect(channelName, () => this.subscribeToMisionesChanges(idUsuario, callbacks), callbacks);
            } else {
              console.error('❌ Canal realtime misiones usuario: máximo de reintentos alcanzado');
              callbacks.onError('No se pudo conectar al servicio realtime');
            }
          } else if (status === 'CLOSED') {
            this.activeChannels.delete(channelName);
            const attempts = this.reconnectAttempts.get(channelName) || 0;
            if (attempts < this.maxReconnectAttempts) {
              this.handleReconnect(channelName, () => this.subscribeToMisionesChanges(idUsuario, callbacks), callbacks);
            }
          }
        });

      return channel;
    };

    const newChannel = setupChannel();
    this.activeChannels.set(channelName, newChannel);
    return newChannel;
  }

  // Manejador de reconexión con backoff exponencial
  private handleReconnect(
    channelName: string,
    reconnectFn: () => RealtimeChannel,
    callbacks: RealtimeCallbacks
  ): void {
    // Limpiar timeout anterior si existe
    const existingTimeout = this.reconnectTimeouts.get(channelName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const attempts = this.reconnectAttempts.get(channelName) || 0;

    if (attempts < this.maxReconnectAttempts) {
      // Calcular delay con backoff exponencial
      const delay = Math.min(
        this.baseReconnectDelay * Math.pow(2, attempts),
        this.maxReconnectDelay
      );

      if (!this.silentMode) console.log(`🔄 Reconexión ${channelName} en ${delay}ms (${attempts + 1}/${this.maxReconnectAttempts})`);

      const timeout = setTimeout(async () => {
        this.reconnectAttempts.set(channelName, attempts + 1);

        try {
          // Remover canal anterior antes de reconectar
          await supabase.removeChannel(supabase.channel(channelName));
        } catch (error) {
          console.error('Error removiendo canal anterior:', error);
        }

        // Intentar reconectar
        reconnectFn();
      }, delay);

      this.reconnectTimeouts.set(channelName, timeout);
    } else {
      console.error(`❌ Máximo de intentos de reconexión alcanzado para ${channelName}`);
      callbacks.onError('No se pudo restablecer la conexión realtime después de múltiples intentos');
    }
  }

  // Desuscribirse de cambios en tiempo real
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void> {
    if (!this.silentMode) console.log('🧹 Desuscribiendo canal realtime misiones');

    // Encontrar y eliminar el canal del Map
    for (const [name, ch] of this.activeChannels.entries()) {
      if (ch === channel) {
        this.activeChannels.delete(name);
        this.reconnectAttempts.delete(name);
        const timeout = this.reconnectTimeouts.get(name);
        if (timeout) {
          clearTimeout(timeout);
          this.reconnectTimeouts.delete(name);
        }
        break;
      }
    }

    return supabase.removeChannel(channel).then(() => {
      if (!this.silentMode) console.log('✅ Canal realtime misiones removido');
    }).catch((error) => {
      console.error('❌ Error removiendo canal realtime misiones:', error);
      throw error;
    });
  }
}