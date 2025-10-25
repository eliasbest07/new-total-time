import { useProyectosContext } from '@/app/contexts/ProyectosContext';

// Hook que simplemente usa el contexto
export const useProyectos = () => {
  return useProyectosContext();
};