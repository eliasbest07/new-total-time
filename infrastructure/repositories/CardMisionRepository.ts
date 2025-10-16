import { CardMision, CreateCardMisionDTO, UpdateCardMisionDTO } from "@/domain/entities/CardMision";

export interface CardMisionRepository {
  // Obtener datos de misión por ID de card
  getByCardId(idCard: string): Promise<CardMision | null>;

  // Obtener datos de misión por ID de misión
  getByMisionId(idMision: number): Promise<CardMision | null>;

  // Crear datos de misión para una card
  create(cardMision: CreateCardMisionDTO): Promise<CardMision | null>;

  // Actualizar datos de misión
  update(idCard: string, updates: UpdateCardMisionDTO): Promise<CardMision | null>;

  // Eliminar datos de misión
  delete(idCard: string): Promise<boolean>;

  // Actualizar estado de ejecución (play/pause)
  updateRunningState(idCard: string, isRunning: boolean): Promise<CardMision | null>;

  // Actualizar URL de última captura
  updateLastCapture(idCard: string, lastCaptureUrl: string): Promise<CardMision | null>;
}
