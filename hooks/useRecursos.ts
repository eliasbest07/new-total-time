import { useRecursosContext } from '@/app/contexts/RecursosContext';

// Hook que simplemente usa el contexto
// El parámetro idUsuario se mantiene por compatibilidad pero se ignora
export const useRecursos = (idUsuario?: string | null) => {
  return useRecursosContext();
};