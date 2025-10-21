import { Actividad } from "./Actividad";
import { Mision } from "./Mision";

export interface Proyecto {
  id: number;
  created_at: string;
  nombre: string;
  descripcion: string | null;
  icono: string | null;
  // Campos opcionales para relaciones
  misiones?: Mision[]; // Array de misiones asociadas
  actividades?: Actividad[]; // Array de actividades asociadas
}