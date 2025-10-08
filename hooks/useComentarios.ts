import { useState, useEffect, useCallback, useRef } from 'react';
import { SupabaseComentarioRepository } from '@/infrastructure/datasource/SupabaseComentarioRepository';
import { Comentario } from '@/domain/entities/Comentario';

interface UseComentariosReturn {
  comentarios: Comentario[];
  loading: boolean;
  error: string | null;
}

export const useComentarios = (comentarioIds: string[] | null): UseComentariosReturn => {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comentarioRepository = useRef(new SupabaseComentarioRepository());

  const loadComentarios = useCallback(async () => {
    if (!comentarioIds || comentarioIds.length === 0) {
      setComentarios([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const comentariosData = await comentarioRepository.current.getComentariosByIds(comentarioIds);
      setComentarios(comentariosData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar comentarios';
      console.error('❌ Error cargando comentarios:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [comentarioIds]);

  useEffect(() => {
    loadComentarios();
  }, [loadComentarios]);

  return {
    comentarios,
    loading,
    error
  };
};
