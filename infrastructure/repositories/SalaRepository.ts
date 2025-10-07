import { Sala } from "@/domain/entities/Sala";
import { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeCallbacks {
  onSalasUpdated: (salas: Sala[]) => void;
  onError: (error: string) => void;
}

export interface SalaRepository {
  getSalaIdsByOrganizacion(idOrganizacion: string): Promise<string[]>;
  getSalasByIds(salaIds: string[]): Promise<Sala[]>;
  getSalasByOrganizacion(idOrganizacion: string): Promise<Sala[]>;
  subscribeToSalasChanges(idOrganizacion: string, callbacks: RealtimeCallbacks): RealtimeChannel;
  unsubscribeFromChanges(channel: RealtimeChannel): Promise<void>;
}