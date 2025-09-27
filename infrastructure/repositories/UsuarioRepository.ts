import { Usuario } from "@/domain/entities/Usuario";

export interface UsuarioRepository {
  getUsuariosByOrganizacion(organizacionId: string): Promise<Usuario[]>;
  getUsuarioById(id: string): Promise<Usuario | null>;
  updateUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario | null>;
}