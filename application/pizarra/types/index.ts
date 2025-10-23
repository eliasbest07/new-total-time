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
  duration: number; // en minutos
  isRunning: boolean;
  timeLeft: number; // en segundos
  id_usuario?: string; // ID del usuario que creó/ejecuta la actividad
  id_actividad?: string; // ID único de la actividad en la base de datos
}

export interface MisionData {
  title: string;
  hours: number;
  description: string;
  idCreador?: string | null; // UUID del creador de la misión
  isRunning?: boolean;
  lastCaptureUrl?: string | null;
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
  nombre: string;
  description: string | null;
  imagen_url: string | null;
  type: string | null;
  utility: string | null;
  palette: string | null;
  colors: string[] | null;
  producto: string | null;
  publico: boolean;
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
  restoreCard?: (cardData: any) => void;
  clearStorage?: () => void;
  exportStorage?: () => void;
  importStorage?: (content: string) => void;
}

export interface PizarraProps {
  onShowScreenshots?: (cardId: string) => void;
}
