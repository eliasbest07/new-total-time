// infrastructure/datasource/SupabaseTimeTrackingRepository.ts
import { supabase } from "@/infrastructure/services/SupabaseClient";

export interface TimeInterval {
  id: number;
  hora_inicio: string; // formato: "HH:MM:SS" o timestamp
  hora_fin: string;
  fecha: string; // formato: "YYYY-MM-DD"
  id_usuario: string;
  duracion?: number; // duración en minutos o segundos
  created_at?: string;
}

export class SupabaseTimeTrackingRepository {
  /**
   * Obtener intervalos de tiempo para un usuario en una fecha específica
   */
  async getIntervalsByUserAndDate(
    userId: string,
    fecha: string
  ): Promise<TimeInterval[]> {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('id_usuario', userId)
        .eq('fecha', fecha)
        .order('hora_inicio', { ascending: true });

      if (error) {
        console.error('Error obteniendo intervalos:', error);
        return [];
      }

      return data as TimeInterval[];
    } catch (error) {
      console.error('Error en getIntervalsByUserAndDate:', error);
      return [];
    }
  }

  /**
   * Obtener intervalos de tiempo para un usuario en un rango de fechas
   */
  async getIntervalsByUserAndDateRange(
    userId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<TimeInterval[]> {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .select('*')
        .eq('id_usuario', userId)
        .gte('fecha', fechaInicio)
        .lte('fecha', fechaFin)
        .order('fecha', { ascending: false })
        .order('hora_inicio', { ascending: true });

      if (error) {
        console.error('Error obteniendo intervalos por rango:', error);
        return [];
      }

      return data as TimeInterval[];
    } catch (error) {
      console.error('Error en getIntervalsByUserAndDateRange:', error);
      return [];
    }
  }

  /**
   * Crear un nuevo intervalo de tiempo
   */
  async createInterval(interval: Omit<TimeInterval, 'id' | 'created_at'>): Promise<TimeInterval | null> {
    try {
      const { data, error } = await supabase
        .from('time_tracking')
        .insert([interval])
        .select()
        .single();

      if (error) {
        console.error('Error creando intervalo:', error);
        return null;
      }

      return data as TimeInterval;
    } catch (error) {
      console.error('Error en createInterval:', error);
      return null;
    }
  }

  /**
   * Obtener el total de tiempo trabajado hoy por un usuario
   */
  async getTotalTimeToday(userId: string): Promise<number> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const intervals = await this.getIntervalsByUserAndDate(userId, today);

      // Sumar todas las duraciones
      const totalMinutes = intervals.reduce((sum, interval) => {
        return sum + (interval.duracion || 0);
      }, 0);

      return totalMinutes;
    } catch (error) {
      console.error('Error en getTotalTimeToday:', error);
      return 0;
    }
  }
}
