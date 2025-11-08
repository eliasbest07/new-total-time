import { Actividad } from "./Actividad";
import { Mision } from "./Mision";

export interface Proyecto {
  id: number;
  created_at: string;
  nombre: string | null;
  descripcion: string | null;
  icono: string | null;
  id_organizacion: string | null; // UUID de la organización
  colors: string[] | null; // Array de colores del proyecto [primario, secundario, acento]
  // Campos opcionales para relaciones
  misiones?: Mision[]; // Array de misiones asociadas
  actividades?: Actividad[]; // Array de actividades asociadas
}