// infrastructure/repositories/CaptureRepositorySupabase.ts

import { supabase } from '@/infrastructure/services/SupabaseClient';
import { CaptureRepository } from '@/infrastructure/repositories/CaptureRepository';
import { Capture, CaptureCreate } from '@/domain/entities/Capture';

export class CaptureRepositorySupabase implements CaptureRepository {
  private tableName = 'capture';

  private mapToEntity(row: any): Capture {
    return {
      id: row.id,
      created_at: new Date(row.created_at),
      id_usuario: row.id_usuario,
      img_url: row.img_url,
      mision_actividad: row.mision_actividad,
      id_bloque: row.id_bloque,
      detalle_img: row.detalle_img,
      total_trabajado_hoy: row.total_trabajado_hoy,
      tiempo_tarea_actual: row.tiempo_tarea_actual,
    };
  }

  async create(capture: CaptureCreate): Promise<Capture> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([capture])
      .select()
      .single();

    if (error) throw new Error(`Error al crear captura: ${error.message}`);
    return this.mapToEntity(data);
  }

  async getByBloque(idBloque: string): Promise<Capture[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id_bloque', idBloque)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al obtener capturas: ${error.message}`);
    return data.map(row => this.mapToEntity(row));
  }

  async getByUsuario(idUsuario: string): Promise<Capture[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id_usuario', idUsuario)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Error al obtener capturas: ${error.message}`);
    return data.map(row => this.mapToEntity(row));
  }

  async deleteByBloque(idBloque: string): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id_bloque', idBloque);

    if (error) throw new Error(`Error al eliminar capturas: ${error.message}`);
  }

  async deleteAll(): Promise<void> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', 0);

    if (error) throw new Error(`Error al eliminar capturas: ${error.message}`);
  }
}