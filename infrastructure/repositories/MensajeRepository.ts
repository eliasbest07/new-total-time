import { Mensaje } from "@/domain/entities/Mensaje";

export interface MensajeRepository {
  // Obtener conversación entre dos usuarios
  getConversacion(userId1: string, userId2: string): Promise<Mensaje[]>;

  // Enviar un mensaje (opcionalmente con referencia a una card compartida)
  enviarMensaje(idEmisor: string, idReceptor: string, texto: string, idCardRef?: string): Promise<Mensaje | null>;

  // Marcar mensaje como leído
  marcarComoLeido(mensajeId: string): Promise<boolean>;

  // Marcar todos los mensajes de una conversación como leídos
  marcarConversacionComoLeida(userId: string, otroUserId: string): Promise<boolean>;
}
