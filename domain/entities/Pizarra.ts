export interface Pizarra {
  id: string; // uuid
  id_usuario: string; // uuid
  pan_offset_x: number;
  pan_offset_y: number;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}

export interface PizarraData {
  cards: any[]; // Las cards se guardarán en una tabla separada
  connections: any[]; // Las conexiones también
}
