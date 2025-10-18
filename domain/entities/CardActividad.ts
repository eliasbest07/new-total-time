export interface CardActividad {
  id: string;
  id_card: string;
  subject: string | null;
  date: string | null;
  time: string | null;
  duration: number | null;
  is_running: boolean | null;
  time_left: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCardActividadDTO {
  id_card: string;
  subject?: string | null;
  date?: string | null;
  time?: string | null;
  duration?: number | null;
  is_running?: boolean;
  time_left?: number | null;
}

export interface UpdateCardActividadDTO {
  subject?: string | null;
  date?: string | null;
  time?: string | null;
  duration?: number | null;
  is_running?: boolean;
  time_left?: number | null;
}
