import { PizarraPermission, CreatePizarraPermissionDTO, UpdatePizarraPermissionDTO } from '@/domain/entities/PizarraPermission';

export interface PizarraPermissionRepository {
  /**
   * Obtiene el permiso entre dos usuarios
   */
  getPermission(ownerId: number, editorId: number): Promise<PizarraPermission | null>;

  /**
   * Crea una solicitud de permiso
   */
  createRequest(dto: CreatePizarraPermissionDTO): Promise<PizarraPermission | null>;

  /**
   * Actualiza el estado del permiso (otorgar o revocar)
   */
  updatePermission(ownerId: number, editorId: number, dto: UpdatePizarraPermissionDTO): Promise<PizarraPermission | null>;

  /**
   * Obtiene todas las solicitudes pendientes para un dueño
   */
  getPendingRequests(ownerId: number): Promise<PizarraPermission[]>;

  /**
   * Obtiene todos los permisos otorgados por un dueño
   */
  getGrantedPermissions(ownerId: number): Promise<PizarraPermission[]>;
}
