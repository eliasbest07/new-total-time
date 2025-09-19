import { supabase } from "@/infrastructure/services/SupabaseClient";
import { Sala } from "@/domain/entities/Sala";

export class SalaRepository {
  
  // Obtener los IDs de salas de una organización
  async getSalaIdsByOrganizacion(idOrganizacion: string): Promise<string[]> {
    try {
      console.log('🏢 Obteniendo IDs de salas para organización:', idOrganizacion);
      
      const { data, error } = await supabase
        .from('organizacion')
        .select('id_salas')
        .eq('id', idOrganizacion)
        .single();

      if (error) {
        console.error('❌ Error obteniendo IDs de salas:', error);
        return [];
      }

      // Asegurar que id_salas sea un array
      let idSalas = data?.id_salas || [];
      
      // Si no es un array, convertirlo
      if (!Array.isArray(idSalas)) {
        idSalas = [];
      }
      
      // Convertir todos los elementos a string
      const idSalasString = idSalas.map(id => String(id));
      
      console.log('📋 IDs de salas encontrados:', idSalasString);
      return idSalasString;
    } catch (error) {
      console.error('❌ Error en getSalaIdsByOrganizacion:', error);
      return [];
    }
  }

  // Obtener información completa de las salas por sus IDs
  async getSalasByIds(salaIds: string[]): Promise<Sala[]> {
    try {
      if (salaIds.length === 0) {
        console.log('ℹ️ No hay IDs de salas para buscar');
        return [];
      }

      console.log('🔍 Buscando salas con IDs:', salaIds);
      
      // Convertir los IDs a números para la consulta (ya que el campo id es bigint)
      const salaIdsNumeric = salaIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      
      if (salaIdsNumeric.length === 0) {
        console.log('⚠️ No se pudieron convertir los IDs a números válidos');
        return [];
      }
      
      const { data, error } = await supabase
        .from('sala')
        .select('*')
        .in('id', salaIdsNumeric);

      if (error) {
        console.error('❌ Error obteniendo salas:', error);
        return [];
      }

      const salas = data || [];
      console.log('🏠 Salas encontradas:', salas);
      
      // Marcar la primera sala como activa por defecto
      if (salas.length > 0) {
        salas[0].activa = true;
      }

      return salas;
    } catch (error) {
      console.error('❌ Error en getSalasByIds:', error);
      return [];
    }
  }

  // Método principal para obtener todas las salas de una organización
  async getSalasByOrganizacion(idOrganizacion: string): Promise<Sala[]> {
    try {
      console.log('🚀 Iniciando carga de salas para organización:', idOrganizacion);
      
      // Paso 1: Obtener los IDs de las salas
      const salaIds = await this.getSalaIdsByOrganizacion(idOrganizacion);
      
      if (salaIds.length === 0) {
        console.log('ℹ️ No se encontraron salas para esta organización');
        return [];
      }

      // Paso 2: Obtener la información completa de las salas
      const salas = await this.getSalasByIds(salaIds);
      
      console.log('✅ Carga de salas completada:', salas.length, 'salas encontradas');
      return salas;
    } catch (error) {
      console.error('❌ Error en getSalasByOrganizacion:', error);
      return [];
    }
  }
}