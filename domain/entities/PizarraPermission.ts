/**
 * Entidad para permisos de edición de pizarra
 */
export interface PizarraPermission {
  id: string;
  id_usuario_owner: number; // Dueño de la pizarra
  id_usuario_editor: number; // Usuario que solicita/tiene permiso
  granted: boolean; // Si el permiso fue otorgado
  requested_at: string; // Timestamp de solicitud
  granted_at: string | null; // Timestamp cuando se otorgó
  created_at: string;
  updated_at: string;
}

export interface CreatePizarraPermissionDTO {
  id_usuario_owner: number;
  id_usuario_editor: number;
  granted?: boolean;
}

export interface UpdatePizarraPermissionDTO {
  granted?: boolean;
  granted_at?: string | null;
}
