export interface Proyecto {
  id: number;
  created_at: string;
  nombre: string;
  user_id: string | null;
  ip_creacion: string | null;
  pais_creacion: string | null;
  publico: boolean;
  imagen_url: string | null;
  description: string | null;
  style_prompt: string | null;
  type: string | null;
  utility: string | null;
  palette: string | null;
  colors: string[] | null;
  timestamp: string | null;
  producto: string | null;
}