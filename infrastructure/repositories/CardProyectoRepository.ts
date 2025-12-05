import { CardProyecto, CreateCardProyectoDTO, UpdateCardProyectoDTO } from "@/domain/entities/CardProyecto";

/**
 * Repositorio para gestionar la relación entre cards y proyectos
 */
export interface CardProyectoRepository {
  /**
   * Obtiene la relación card-proyecto por ID de card
   */
  getByCardId(idCard: string): Promise<CardProyecto | null>;

  /**
   * Obtiene la relación card-proyecto por ID de proyecto
   */
  getByProyectoId(idProyecto: number): Promise<CardProyecto | null>;

  /**
   * Crea una nueva relación card-proyecto
   */
  create(cardProyecto: CreateCardProyectoDTO): Promise<CardProyecto | null>;

  /**
   * Actualiza una relación card-proyecto
   */
  update(idCard: string, updates: UpdateCardProyectoDTO): Promise<CardProyecto | null>;

  /**
   * Elimina una relación card-proyecto
   */
  delete(idCard: string): Promise<boolean>;
}
