/**
 * Entidad: CardConnectionOrganizacion
 *
 * Representa una conexión visual (línea) entre dos cards
 * en la pizarra de organización. Permite crear relaciones
 * visuales entre tareas, misiones, proyectos, etc.
 */
export interface CardConnectionOrganizacion {
  id: string; // UUID - ID en la base de datos
  idPizarraOrganizacion: string; // UUID - Referencia a pizarra_organizacion.id
  connectionId: string; // ID de la conexión en el frontend (ej: "conn-1")
  fromCardId: string | null; // ID del card origen (puede ser null para líneas libres)
  toCardId: string; // ID del card destino
  createdAt: string; // ISO timestamp
}
