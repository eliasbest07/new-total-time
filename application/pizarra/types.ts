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
}

export interface MisionData {
  title: string;
  hours: number;
  description: string;
  isRunning?: boolean;
  lastCaptureUrl?: string;
  id_usuario?: string; // ID del usuario que creó/ejecuta la misión
  id_mision?: string; // ID único de la misión en la base de datos
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
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export interface PizarraRef {
  addNoteCard: (text: string) => void;
  addTodoCard: (text: string) => void;
  clearStorage?: () => void;
  exportStorage?: () => void;
  importStorage?: (content: string) => void;
}