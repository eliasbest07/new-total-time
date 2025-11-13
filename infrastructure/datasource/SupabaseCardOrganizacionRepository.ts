import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardOrganizacion } from "@/domain/entities/CardOrganizacion";
import { CardMisionOrganizacion } from "@/domain/entities/CardMisionOrganizacion";
import { CardConnectionOrganizacion } from "@/domain/entities/CardConnectionOrganizacion";

/**
 * DTO para crear una nueva card de organización
 */
export interface CreateCardOrganizacionDTO {
  id_pizarra_organizacion: string;
  card_id: string;
  type: string;
  title?: string | null;
  content?: string | null;
  x: number;
  y: number;
  width?: number;
  height?: number;
  font_size?: number;
  z_index?: number;
  color?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * DTO para actualizar una card existente
 */
export interface UpdateCardOrganizacionDTO {
  title?: string | null;
  content?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  font_size?: number;
  z_index?: number;
  color?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Repositorio para manejar operaciones de cards de la pizarra de organización
 */
export class SupabaseCardOrganizacionRepository {

  // =========================================================================
  // CARDS
  // =========================================================================

  /**
   * Obtiene todas las cards de una pizarra de organización
   */
  async getCardsByPizarra(idPizarraOrganizacion: string): Promise<CardOrganizacion[]> {
    try {
      console.log('🃏 [CardsOrg] Obteniendo cards de pizarra:', idPizarraOrganizacion);

      const { data, error } = await supabase
        .from('cards_organizacion')
        .select('*')
        .eq('id_pizarra_organizacion', idPizarraOrganizacion)
        .order('z_index', { ascending: true });

      if (error) {
        console.error('❌ [CardsOrg] Error obteniendo cards:', error);
        return [];
      }

      console.log('✅ [CardsOrg] Cards encontradas:', data?.length || 0);
      return data.map(this.mapCardToDomain);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en getCardsByPizarra:', error);
      return [];
    }
  }

  /**
   * Crea una nueva card
   */
  async createCard(card: CreateCardOrganizacionDTO): Promise<CardOrganizacion | null> {
    try {
      console.log('➕ [CardsOrg] Creando nueva card:', card.card_id);

      const { data, error } = await supabase
        .from('cards_organizacion')
        .insert([card])
        .select()
        .single();

      if (error) {
        console.error('❌ [CardsOrg] Error creando card:', error);
        return null;
      }

      console.log('✅ [CardsOrg] Card creada:', data.id);
      return this.mapCardToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en createCard:', error);
      return null;
    }
  }

  /**
   * Actualiza una card existente
   */
  async updateCard(
    idPizarraOrganizacion: string,
    cardId: string,
    updates: UpdateCardOrganizacionDTO
  ): Promise<CardOrganizacion | null> {
    try {
      console.log('✏️ [CardsOrg] Actualizando card:', cardId);

      const { data, error } = await supabase
        .from('cards_organizacion')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_pizarra_organizacion', idPizarraOrganizacion)
        .eq('card_id', cardId)
        .select()
        .single();

      if (error) {
        console.error('❌ [CardsOrg] Error actualizando card:', error);
        return null;
      }

      console.log('✅ [CardsOrg] Card actualizada');
      return this.mapCardToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en updateCard:', error);
      return null;
    }
  }

  /**
   * Actualiza la posición de una card
   */
  async updateCardPosition(
    idPizarraOrganizacion: string,
    cardId: string,
    x: number,
    y: number
  ): Promise<CardOrganizacion | null> {
    return this.updateCard(idPizarraOrganizacion, cardId, { x, y });
  }

  /**
   * Actualiza el tamaño de una card
   */
  async updateCardSize(
    idPizarraOrganizacion: string,
    cardId: string,
    width: number,
    height: number
  ): Promise<CardOrganizacion | null> {
    return this.updateCard(idPizarraOrganizacion, cardId, { width, height });
  }

  /**
   * Elimina una card
   */
  async deleteCard(idPizarraOrganizacion: string, cardId: string): Promise<boolean> {
    try {
      console.log('🗑️ [CardsOrg] Eliminando card:', cardId);

      const { error } = await supabase
        .from('cards_organizacion')
        .delete()
        .eq('id_pizarra_organizacion', idPizarraOrganizacion)
        .eq('card_id', cardId);

      if (error) {
        console.error('❌ [CardsOrg] Error eliminando card:', error);
        return false;
      }

      console.log('✅ [CardsOrg] Card eliminada');
      return true;

    } catch (error) {
      console.error('❌ [CardsOrg] Error en deleteCard:', error);
      return false;
    }
  }

  /**
   * Elimina todas las cards de una pizarra
   */
  async deleteAllCards(idPizarraOrganizacion: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cards_organizacion')
        .delete()
        .eq('id_pizarra_organizacion', idPizarraOrganizacion);

      if (error) {
        console.error('❌ [CardsOrg] Error eliminando todas las cards:', error);
        return false;
      }

      console.log('✅ [CardsOrg] Todas las cards eliminadas');
      return true;

    } catch (error) {
      console.error('❌ [CardsOrg] Error en deleteAllCards:', error);
      return false;
    }
  }

  // =========================================================================
  // CARD MISIONES
  // =========================================================================

  /**
   * Obtiene datos de misión por ID de card
   */
  async getCardMisionByCardId(idCard: string): Promise<CardMisionOrganizacion | null> {
    try {
      const { data, error } = await supabase
        .from('card_misiones_organizacion')
        .select('*')
        .eq('id_card', idCard)
        .maybeSingle();

      if (error) {
        console.error('❌ [CardsOrg] Error obteniendo card mision:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapCardMisionToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en getCardMisionByCardId:', error);
      return null;
    }
  }

  /**
   * Crea datos de misión para una card
   */
  async createCardMision(cardMision: {
    id_card: string;
    id_mision: number;
    is_running?: boolean;
    last_capture_url?: string | null;
    id_usuario_asignado?: number | null;
    estado?: string;
    card_todos?: string[];
    fecha_entrega?: string | null;
  }): Promise<CardMisionOrganizacion | null> {
    try {
      console.log('➕ [CardsOrg] Creando card mision para card:', cardMision.id_card);

      const { data, error } = await supabase
        .from('card_misiones_organizacion')
        .insert([{
          ...cardMision,
          is_running: cardMision.is_running ?? false,
          estado: cardMision.estado ?? 'pendiente',
          card_todos: cardMision.card_todos ?? []
        }])
        .select()
        .single();

      if (error) {
        console.error('❌ [CardsOrg] Error creando card mision:', error);
        return null;
      }

      console.log('✅ [CardsOrg] Card mision creada:', data.id);
      return this.mapCardMisionToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en createCardMision:', error);
      return null;
    }
  }

  /**
   * Actualiza datos de misión
   */
  async updateCardMision(
    idCard: string,
    updates: {
      is_running?: boolean;
      last_capture_url?: string | null;
      id_usuario_asignado?: number | null;
      estado?: string;
      card_todos?: string[];
      fecha_entrega?: string | null;
    }
  ): Promise<CardMisionOrganizacion | null> {
    try {
      console.log('✏️ [CardsOrg] Actualizando card mision:', idCard);

      const { data, error } = await supabase
        .from('card_misiones_organizacion')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id_card', idCard)
        .select()
        .single();

      if (error) {
        console.error('❌ [CardsOrg] Error actualizando card mision:', error);
        return null;
      }

      console.log('✅ [CardsOrg] Card mision actualizada');
      return this.mapCardMisionToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en updateCardMision:', error);
      return null;
    }
  }

  /**
   * Elimina datos de misión
   */
  async deleteCardMision(idCard: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('card_misiones_organizacion')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ [CardsOrg] Error eliminando card mision:', error);
        return false;
      }

      console.log('✅ [CardsOrg] Card mision eliminada');
      return true;

    } catch (error) {
      console.error('❌ [CardsOrg] Error en deleteCardMision:', error);
      return false;
    }
  }

  // =========================================================================
  // CONEXIONES
  // =========================================================================

  /**
   * Obtiene todas las conexiones de una pizarra
   */
  async getConnectionsByPizarra(
    idPizarraOrganizacion: string
  ): Promise<CardConnectionOrganizacion[]> {
    try {
      const { data, error } = await supabase
        .from('card_connections_organizacion')
        .select('*')
        .eq('id_pizarra_organizacion', idPizarraOrganizacion)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [CardsOrg] Error obteniendo conexiones:', error);
        return [];
      }

      return data.map(this.mapConnectionToDomain);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en getConnectionsByPizarra:', error);
      return [];
    }
  }

  /**
   * Crea una nueva conexión
   */
  async createConnection(connection: {
    id_pizarra_organizacion: string;
    connection_id: string;
    from_card_id: string | null;
    to_card_id: string;
  }): Promise<CardConnectionOrganizacion | null> {
    try {
      console.log('➕ [CardsOrg] Creando conexión:', connection.connection_id);

      const { data, error } = await supabase
        .from('card_connections_organizacion')
        .insert([connection])
        .select()
        .single();

      if (error) {
        console.error('❌ [CardsOrg] Error creando conexión:', error);
        return null;
      }

      console.log('✅ [CardsOrg] Conexión creada');
      return this.mapConnectionToDomain(data);

    } catch (error) {
      console.error('❌ [CardsOrg] Error en createConnection:', error);
      return null;
    }
  }

  /**
   * Elimina una conexión
   */
  async deleteConnection(
    idPizarraOrganizacion: string,
    connectionId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('card_connections_organizacion')
        .delete()
        .eq('id_pizarra_organizacion', idPizarraOrganizacion)
        .eq('connection_id', connectionId);

      if (error) {
        console.error('❌ [CardsOrg] Error eliminando conexión:', error);
        return false;
      }

      console.log('✅ [CardsOrg] Conexión eliminada');
      return true;

    } catch (error) {
      console.error('❌ [CardsOrg] Error en deleteConnection:', error);
      return false;
    }
  }

  /**
   * Elimina todas las conexiones de una pizarra
   */
  async deleteAllConnections(idPizarraOrganizacion: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('card_connections_organizacion')
        .delete()
        .eq('id_pizarra_organizacion', idPizarraOrganizacion);

      if (error) {
        console.error('❌ [CardsOrg] Error eliminando conexiones:', error);
        return false;
      }

      console.log('✅ [CardsOrg] Conexiones eliminadas');
      return true;

    } catch (error) {
      console.error('❌ [CardsOrg] Error en deleteAllConnections:', error);
      return false;
    }
  }

  // =========================================================================
  // MAPPERS
  // =========================================================================

  /**
   * Mapea card de BD a dominio
   */
  private mapCardToDomain(data: any): CardOrganizacion {
    return {
      id: data.id,
      idPizarraOrganizacion: data.id_pizarra_organizacion,
      cardId: data.card_id,
      type: data.type,
      title: data.title,
      content: data.content,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      fontSize: data.font_size,
      zIndex: data.z_index,
      color: data.color,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Mapea card mision de BD a dominio
   */
  private mapCardMisionToDomain(data: any): CardMisionOrganizacion {
    return {
      id: data.id,
      idCard: data.id_card,
      idMision: data.id_mision,
      isRunning: data.is_running,
      lastCaptureUrl: data.last_capture_url,
      idUsuarioAsignado: data.id_usuario_asignado,
      estado: data.estado,
      cardTodos: data.card_todos || [],
      fechaEntrega: data.fecha_entrega,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Mapea conexión de BD a dominio
   */
  private mapConnectionToDomain(data: any): CardConnectionOrganizacion {
    return {
      id: data.id,
      idPizarraOrganizacion: data.id_pizarra_organizacion,
      connectionId: data.connection_id,
      fromCardId: data.from_card_id,
      toCardId: data.to_card_id,
      createdAt: data.created_at
    };
  }
}
