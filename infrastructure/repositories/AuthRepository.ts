// src/domain/repositories/IAuthRepository.ts
import { Usuario } from "@/domain/entities/Usuario";

export interface AuthRepository {
  login(email: string, password: string): Promise<Usuario | null>;
  register(email: string, password: string): Promise<Usuario | null>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<Usuario | null>;
}
