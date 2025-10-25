import { Actividad } from "./Actividad";
import { Mision } from "./Mision";

export interface Proyecto {
  id: number;
  created_at: string;
  nombre: string;
  descripcion: string | null;
  description: string | null; // Alias de descripcion usado en algunos lugares
  icono: string | null;
  imagen_url: string | null; // URL de la imagen/logo del proyecto
  type: string | null; // Tipo o estado del proyecto (development, review, completed, etc.)
  colors: string[] | null; // Array de colores del proyecto [primario, secundario, acento]
  user_id: string | null; // ID del usuario propietario del proyecto
  // Campos opcionales para relaciones
  misiones?: Mision[]; // Array de misiones asociadas
  actividades?: Actividad[]; // Array de actividades asociadas
}