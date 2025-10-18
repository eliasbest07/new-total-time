import { supabase } from "@/infrastructure/services/SupabaseClient";
import { CardTodo, CreateCardTodoDTO, UpdateCardTodoDTO } from "@/domain/entities/CardTodo";
import { CardTodoRepository } from "@/infrastructure/repositories/CardTodoRepository";

export class SupabaseCardTodoRepository implements CardTodoRepository {

  async getByCardId(idCard: string): Promise<CardTodo[]> {
    try {
      console.log('📋 Obteniendo todos de la card:', idCard);

      const { data, error } = await supabase
        .from('card_todos')
        .select('*')
        .eq('id_card', idCard)
        .order('position', { ascending: true });

      if (error) {
        console.error('❌ Error al obtener todos:', error);
        throw error;
      }

      console.log('✅ Todos obtenidos:', data?.length || 0);
      return data as CardTodo[] || [];
    } catch (error) {
      console.error('❌ Error en getByCardId:', error);
      return [];
    }
  }

  async getById(id: string): Promise<CardTodo | null> {
    try {
      console.log('📋 Obteniendo todo:', id);

      const { data, error } = await supabase
        .from('card_todos')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('⚠️ Todo no encontrado');
          return null;
        }
        console.error('❌ Error al obtener todo:', error);
        throw error;
      }

      console.log('✅ Todo obtenido:', data?.id);
      return data as CardTodo;
    } catch (error) {
      console.error('❌ Error en getById:', error);
      return null;
    }
  }

  async create(cardTodo: CreateCardTodoDTO): Promise<CardTodo | null> {
    try {
      console.log('📝 Creando nuevo todo para card:', cardTodo.id_card);

      const { data, error } = await supabase
        .from('card_todos')
        .insert([cardTodo])
        .select()
        .single();

      if (error) {
        console.error('❌ Error al crear todo:', error);
        throw error;
      }

      console.log('✅ Todo creado:', data?.id);
      return data as CardTodo;
    } catch (error) {
      console.error('❌ Error en create:', error);
      return null;
    }
  }

  async update(id: string, updates: UpdateCardTodoDTO): Promise<CardTodo | null> {
    try {
      console.log('🔄 Actualizando todo:', id);

      const { data, error } = await supabase
        .from('card_todos')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error al actualizar todo:', error);
        throw error;
      }

      console.log('✅ Todo actualizado:', data?.id);
      return data as CardTodo;
    } catch (error) {
      console.error('❌ Error en update:', error);
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando todo:', id);

      const { error } = await supabase
        .from('card_todos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error al eliminar todo:', error);
        throw error;
      }

      console.log('✅ Todo eliminado');
      return true;
    } catch (error) {
      console.error('❌ Error en delete:', error);
      return false;
    }
  }

  async deleteByCardId(idCard: string): Promise<boolean> {
    try {
      console.log('🗑️ Eliminando todos de la card:', idCard);

      const { error } = await supabase
        .from('card_todos')
        .delete()
        .eq('id_card', idCard);

      if (error) {
        console.error('❌ Error al eliminar todos:', error);
        throw error;
      }

      console.log('✅ Todos eliminados');
      return true;
    } catch (error) {
      console.error('❌ Error en deleteByCardId:', error);
      return false;
    }
  }

  async toggleCompleted(id: string, completed: boolean): Promise<CardTodo | null> {
    try {
      console.log('✓ Cambiando estado de todo:', id, 'a', completed);

      const { data, error } = await supabase
        .from('card_todos')
        .update({
          completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error al cambiar estado:', error);
        throw error;
      }

      console.log('✅ Estado cambiado');
      return data as CardTodo;
    } catch (error) {
      console.error('❌ Error en toggleCompleted:', error);
      return null;
    }
  }

  async updatePosition(id: string, position: number): Promise<CardTodo | null> {
    try {
      console.log('↕️ Actualizando posición del todo:', id, 'a', position);

      const { data, error } = await supabase
        .from('card_todos')
        .update({
          position,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error al actualizar posición:', error);
        throw error;
      }

      console.log('✅ Posición actualizada');
      return data as CardTodo;
    } catch (error) {
      console.error('❌ Error en updatePosition:', error);
      return null;
    }
  }

  async reorderTodos(idCard: string, todoIds: string[]): Promise<boolean> {
    try {
      console.log('🔀 Reordenando todos de la card:', idCard);

      // Actualizar la posición de cada todo basándose en su índice en el array
      const updates = todoIds.map((todoId, index) =>
        supabase
          .from('card_todos')
          .update({
            position: index,
            updated_at: new Date().toISOString()
          })
          .eq('id', todoId)
          .eq('id_card', idCard)
      );

      const results = await Promise.all(updates);

      // Verificar si alguna actualización falló
      const hasError = results.some(result => result.error);

      if (hasError) {
        console.error('❌ Error al reordenar algunos todos');
        return false;
      }

      console.log('✅ Todos reordenados');
      return true;
    } catch (error) {
      console.error('❌ Error en reorderTodos:', error);
      return false;
    }
  }
}
