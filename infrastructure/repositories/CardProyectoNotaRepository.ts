import { CardProyectoNota, CreateCardProyectoNotaDTO, UpdateCardProyectoNotaDTO } from '@/domain/entities/CardProyectoNota';

/**
 * Repositorio para gestionar la relación entre cards de proyecto y notas
 */
export interface CardProyectoNotaRepository {
  /**
   * Obtiene todas las notas asociadas a un card de proyecto
   */
  getByCardProyectoId(idCardProyecto: string): Promise<CardProyectoNota[]>;

  /**
   * Crea una nueva relación proyecto-nota
   */
  create(data: CreateCardProyectoNotaDTO): Promise<CardProyectoNota | null>;

  /**
   * Actualiza una relación proyecto-nota
   */
  update(id: string, updates: UpdateCardProyectoNotaDTO): Promise<CardProyectoNota | null>;

  /**
   * Elimina una relación proyecto-nota
   */
  delete(idCardProyecto: string, idCardNota: string): Promise<boolean>;

  /**
   * Elimina todas las notas de un proyecto
   */
  deleteAllByProyecto(idCardProyecto: string): Promise<boolean>;
}
