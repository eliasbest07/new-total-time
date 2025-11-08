export interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

export interface ActivityData {
  subject: string;
  participants: { name: string; initial: string; color: string }[];
  date: string;
  time: string;
  duration: number;
  isRunning: boolean;
  timeLeft: number;
  id_usuario?: string; // ID del usuario que creó/ejecuta la actividad
  id_actividad?: string; // ID único de la actividad en la base de datos
  misionActivaId?: string; // ID de la misión activa en Supabase
}

export interface SubtareaMision {
  id: string;
  text: string;
  completed: boolean;
}

export interface EntregaMision {
  id: string;
  fecha: string;
  descripcion: string;
  imagenes: string[];
  archivos: string[];
  usuario_id: string;
  usuario_nombre: string;
}

export interface MisionData {
  title: string;
  hours: number;
  description: string;
  idCreador?: string | null; // UUID del creador de la misión
  isRunning?: boolean;
  lastCaptureUrl?: string | null;
  id_usuario?: string; // ID del usuario que creó/ejecuta la misión
  id_mision?: number; // ID único de la misión en la base de datos
  id_usuario_asignado?: number | null; // ID del usuario asignado
  usuario_asignado_nombre?: string | null; // Nombre del usuario asignado
  usuario_asignado_avatar?: string | null; // Avatar del usuario asignado
  estado?: 'pendiente' | 'en_progreso' | 'pausada' | 'entregada' | 'aprobada' | 'rechazada' | 'cancelada';
  subtareas?: SubtareaMision[];
  entregas?: EntregaMision[];
  misionActivaId?: string; // ID de la misión activa en Supabase
}

export interface ChatMessage {
  id: number;
  text: string;
  sender: 'me' | 'other';
  timestamp: Date;
}

export interface UsuarioData {
  userId: string; // userAuth del usuario para identificarlo en Supabase
  name: string;
  avatar: string;
  color: string;
  online: boolean;
  messages?: ChatMessage[];
}

export interface ProyectoData {
  id?: number; // ID del proyecto en la base de datos
  nombre: string;
  descripcion: string | null; // Changed from 'description' to match DB
  icono: string | null;
  id_organizacion?: string | null; // UUID de la organización
  colors: string[] | null;
  created_at?: string;
}

export interface RecursoData {
  name: string;
  resourceType: string;
  url: string | null;
  icon: string | null;
  color: string;
}

export interface Card {
  id: string;
  type: string;
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  todos?: TodoItem[];
  fontSize?: number;
  activityData?: ActivityData;
  misionData?: MisionData;
  usuarioData?: UsuarioData;
  proyectoData?: ProyectoData;
  recursoData?: RecursoData;
  imageUrl?: string; // URL de la imagen guardada en Supabase Storage
}

export interface Connection {
  id: string;
  from?: string; // Opcional - puede ser undefined para conexiones desde el canvas
  to: string;
}

export interface PizarraRef {
  addNoteCard: (text: string) => void;
  addTodoCard: (text: string) => void;
  addMisionCardOrganizacion?: (misionData: {
    id_mision: number;
    title: string;
    description: string;
    hours: number;
    id_usuario_asignado?: number;
    usuario_asignado_nombre?: string;
    usuario_asignado_avatar?: string;
  }) => string | void;
  addUsuarioCard?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void;
  removeConnectionBetween?: (cardId1: string, cardId2: string) => void;
  centerOnCard?: (cardId: string) => void;
  findCardByMisionId?: (misionId: number) => string | null;
  restoreCard?: (cardData: Card) => void;
  clearStorage?: () => void;
  exportStorage?: () => void;
  importStorage?: (content: string) => void;
  saveToSupabase?: () => Promise<boolean | undefined>;
  loadFromSupabase?: () => Promise<void>;
  loadPizarraById?: (pizarraId: string) => Promise<void>;
}

export interface PizarraProps {
  onShowScreenshots?: (cardId: string) => void;
  storagePrefix?: string;
  lightMode?: boolean;
  fullMode?: boolean;
  viewingUserId?: string;
  onOpenUserChat?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  usuarios?: Array<{
    id: string | number;
    userAuth?: string;
    profile: {
      nombre: string;
      apellido?: string;
      avatar?: string;
    };
  }>;
  currentUserId?: string;
  onConnectionCreate?: (connection: Connection, fromCard: Card, toCard: Card) => void;
}