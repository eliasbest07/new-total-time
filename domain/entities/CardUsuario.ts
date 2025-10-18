export interface CardUsuario {
  id: string;
  id_card: string;
  user_id: string;
  name: string | null;
  avatar: string | null;
  color: string | null;
  online: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCardUsuarioDTO {
  id_card: string;
  user_id: string;
  name?: string | null;
  avatar?: string | null;
  color?: string | null;
  online?: boolean;
}

export interface UpdateCardUsuarioDTO {
  user_id?: string;
  name?: string | null;
  avatar?: string | null;
  color?: string | null;
  online?: boolean;
}
