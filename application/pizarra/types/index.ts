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
  // Nuevos campos para card de organización
  id_mision?: number; // ID de la misión en la BD
  id_usuario?: string; // ID del usuario que creó/ejecuta la misión
  id_usuario_asignado?: number | null; // ID del usuario asignado
  usuario_asignado_nombre?: string | null; // Nombre del usuario asignado
  usuario_asignado_avatar?: string | null; // Avatar del usuario asignado
  estado?: 'pendiente' | 'en_progreso' | 'pausada' | 'entregada' | 'aprobada' | 'rechazada' | 'cancelada';
  subtareas?: SubtareaMision[];
  entregas?: EntregaMision[];
  misionActivaId?: string; // ID de la misión activa
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
  id_organizacion?: string | number | null; // UUID de la organización (string) o ID numérico
  colors: string[] | null;
  created_at?: string;
  github_url?: string | null; // URL del repositorio de GitHub
  sitio_web_url?: string | null; // URL del sitio web del proyecto
  tecnologias?: string[] | null; // Array de tecnologías usadas (ej: ['Flutter', 'Firebase', 'Figma'])
  notas?: string[]; // IDs de cards de tipo 'text' asociadas como notas
}

export interface RecursoData {
  id?: number;
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
  addNoteCard: (text: string, position?: { x: number; y: number }) => string; // ✅ Retorna el ID del card creado
  addTodoCard: (text?: string) => string; // ✅ Retorna el ID del card creado
  addMisionCardOrganizacion?: (misionData: {
    id_mision: number;
    title: string;
    description: string;
    hours: number;
    id_usuario_asignado?: number;
    usuario_asignado_nombre?: string;
    usuario_asignado_avatar?: string;
  }) => string | void;
  addConnection?: (fromCardId: string, toCardId: string, skipValidation?: boolean) => void;
  removeConnectionBetween?: (cardId1: string, cardId2: string) => void;
  centerOnCard?: (cardId: string) => void;
  findCardByMisionId?: (misionId: number) => string | null;
  updateCard?: (cardId: string, updates: Partial<Card>) => void;
  restoreCard?: (cardData: any) => void;
  clearStorage?: () => void;
  exportStorage?: () => void;
  importStorage?: (content: string) => void;
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
  onOpenCapturasModal?: (misionActivaId: string, misionTitle: string) => void;
  onOpenEditarProyecto?: (
    proyectoId: number,
    initialData: { nombre: string; descripcion: string; icono: string | null; github_url: string; sitio_web_url: string; tecnologias: string[] },
    onRefresh?: () => void
  ) => void;
}
