/**
 * Entidad: PizarraOrganizacionPermiso
 *
 * Define los permisos de edición para la pizarra de organización.
 * Por defecto, todos los miembros de la organización pueden VER
 * la pizarra. Solo los usuarios con un permiso explícito pueden
 * EDITAR el contenido (agregar, modificar, eliminar cards).
 */
export interface PizarraOrganizacionPermiso {
  id: string; // UUID
  idOrganizacion: string; // UUID - Referencia a organizacion.id
  idUsuario: number; // ID numérico del usuario
  puedeEditar: boolean; // true = puede editar, false = solo ver
  otorgadoPor: number | null; // ID del usuario que otorgó el permiso
  otorgadoAt: string | null; // ISO timestamp de cuando se otorgó
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}
