import { supabase } from "@/infrastructure/services/SupabaseClient";
import { MensajeRepository } from "@/infrastructure/repositories/MensajeRepository";
import { Mensaje } from "@/domain/entities/Mensaje";

export class SupabaseMensajeRepository implements MensajeRepository {

  async getConversacion(userId1: string, userId2: string): Promise<Mensaje[]> {
    try {
      // console.log('💬 Obteniendo conversación entre:', userId1, 'y', userId2);

      // Obtener todos los mensajes donde userId1 sea emisor o receptor
      // Y userId2 sea el otro participante
      const { data, error } = await supabase
        .from('mensajes')
        .select('*')
        .or(`and(id_emisor.eq.${userId1},id_receptor.eq.${userId2}),and(id_emisor.eq.${userId2},id_receptor.eq.${userId1})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error obteniendo conversación:', error);
        return [];
      }

      const mensajes = (data || []).map((item) => this.mapToMensaje(item));
      // console.log('✅ Mensajes encontrados:', mensajes.length);
      return mensajes;
    } catch (error) {
      console.error('❌ Error en getConversacion:', error);
      return [];
    }
  }

  async enviarMensaje(idEmisor: string, idReceptor: string, texto: string): Promise<Mensaje | null> {
    try {
      // console.log('📤 Enviando mensaje de', idEmisor, 'a', idReceptor);
      // console.log('📤 Texto del mensaje:', texto);

      const { data, error } = await supabase
        .from('mensajes')
        .insert({
          id_emisor: idEmisor,
          id_receptor: idReceptor,
          texto: texto,
          leido: false
          // No incluir id_conversacion porque es una columna generada
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error enviando mensaje:', error);
        console.error('❌ Detalles del error:', error.message, error.code, error.details, error.hint);
        return null;
      }

      // console.log('✅ Mensaje enviado exitosamente:', data);
      return this.mapToMensaje(data);
    } catch (error) {
      console.error('❌ Error en enviarMensaje:', error);
      return null;
    }
  }

  async marcarComoLeido(mensajeId: string): Promise<boolean> {
    try {
      // console.log('📖 Marcando mensaje como leído:', mensajeId);

      const { error } = await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('id', mensajeId);

      if (error) {
        console.error('❌ Error marcando mensaje como leído:', error);
        return false;
      }

      // console.log('✅ Mensaje marcado como leído');
      return true;
    } catch (error) {
      console.error('❌ Error en marcarComoLeido:', error);
      return false;
    }
  }

  async marcarConversacionComoLeida(userId: string, otroUserId: string): Promise<boolean> {
    try {
      // console.log('📖 Marcando conversación como leída entre:', userId, 'y', otroUserId);

      // Marcar como leídos todos los mensajes donde userId es receptor y otroUserId es emisor
      const { error } = await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('id_receptor', userId)
        .eq('id_emisor', otroUserId)
        .eq('leido', false);

      if (error) {
        console.error('❌ Error marcando conversación como leída:', error);
        return false;
      }

      // console.log('✅ Conversación marcada como leída');
      return true;
    } catch (error) {
      console.error('❌ Error en marcarConversacionComoLeida:', error);
      return false;
    }
  }

  private mapToMensaje(data: any): Mensaje {
    return new Mensaje(
      data.id,
      data.id_emisor,
      data.id_receptor,
      data.texto,
      data.leido || false,
      data.created_at ? new Date(data.created_at) : new Date(),
      data.updated_at ? new Date(data.updated_at) : new Date(),
      data.id_conversacion
    );
  }
}
