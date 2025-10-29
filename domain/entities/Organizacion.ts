import { Proyecto } from "./Proyecto";

export interface Organizacion {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  nombre: string; // default 'Sin nombre'
  sector: string; // default 'Sin tipo definido'
  configuracion: string[] | null;
  isActive: boolean;
  idAdmin: string | null; // uuid, default auth.uid()
  usuarios: number[] | null; // bigint[]
  nivelDeSuscripcion: 'free' | 'premium' | 'enterprise'; // plandesuscripcion enum
  id_recursos: number[] | null; // bigint[]
  id_salas: number[] | null; // bigint[]
  proyectos: number[]; // bigint[], not null, default '{}'
  img_profile: string | null;
  // Campos populados opcionales
  proyectosData?: Proyecto[]; // Array de proyectos populado
}