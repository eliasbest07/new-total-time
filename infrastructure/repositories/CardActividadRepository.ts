import { CardActividad, CreateCardActividadDTO, UpdateCardActividadDTO } from "@/domain/entities/CardActividad";

export interface CardActividadRepository {
  getByCardId(idCard: string): Promise<CardActividad | null>;
  create(cardActividad: CreateCardActividadDTO): Promise<CardActividad | null>;
  update(idCard: string, updates: UpdateCardActividadDTO): Promise<CardActividad | null>;
  delete(idCard: string): Promise<boolean>;
  updateRunningState(idCard: string, isRunning: boolean): Promise<CardActividad | null>;
}
