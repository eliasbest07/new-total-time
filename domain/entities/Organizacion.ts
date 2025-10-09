import { Proyecto } from "./Proyecto";

export interface Organizacion {
  id: string; // uuid
  created_at: string; // timestamp with time zone
  nombre: string | null;
  sector: string | null;
  configuracion: string[] | null;
  isActive: boolean;
  idAdmin: string | null; // uuid
  usuarios: number[] | null; // bigint[]
  nivelDeSuscripcion: 'free' | 'premium' | 'enterprise'; // plandesuscripcion enum
  id_recursos: number[] | null; // bigint[]
  id_salas: number[] | null; // bigint[]
  id_proyectos: number[] | null; // bigint[]
  proyectos?: Proyecto[]; // Array de proyectos populado
}