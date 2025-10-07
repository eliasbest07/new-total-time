import { Actividad } from "./Actividad";
import { Mision } from "./Mision";

export interface Proyecto {
  id: number; // bigint
  created_at: string; // timestamp with time zone
  nombre: string;
  user_id: string | null; // uuid
  ip_creacion: string | null; // inet
  pais_creacion: string | null;
  publico: boolean;
  imagen_url: string | null;
  description: string | null;
  style_prompt: string | null;
  type: string | null;
  utility: string | null;
  palette: string | null;
  colors: string[] | null;
  timestamp: string | null; // timestamp with time zone
  producto: string | null;
  id_misiones: number[] | null; // bigint[]
  id_actividades: number[] | null; // bigint[]
  misiones?: Mision[]; // Array de misiones populado
  actividades?: Actividad[]; // Array de actividades populado
}