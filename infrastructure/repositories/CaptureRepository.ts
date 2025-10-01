// domain/repositories/CaptureRepository.ts

import { Capture, CaptureCreate } from '@/domain/entities/Capture';

export interface CaptureRepository {
  create(capture: CaptureCreate): Promise<Capture>;
  getByBloque(idBloque: string): Promise<Capture[]>;
  getByUsuario(idUsuario: string): Promise<Capture[]>;
  deleteByBloque(idBloque: string): Promise<void>;
  deleteAll(): Promise<void>;
}