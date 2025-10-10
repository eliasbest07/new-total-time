import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
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

    const loadComentarios = useCallback(async () => {
        if (!comentarioIds || comentarioIds.length === 0) {
            setComentarios([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('💬 Cargando comentarios con IDs:', comentarioIds);

            // Obtener comentarios directamente con Supabase
            const { data: comentarios, error } = await supabase
                .from('comentario')
                .select(`
                    id,
                    contenido,
                    created_at,
                    edited_at,
                    likes_count,
                    dislikes_count,
                    id_usuario,
                    usuario:id_usuario (
                        nombre
                    )
                `)
                .in('id', comentarioIds)
                .order('created_at', { ascending: true });

            if (error) {
                throw new Error(error.message);
            }

            if (!comentarios) {
                setComentarios([]);
                return;
            }

            // Mapear los comentarios al formato esperado
            const comentariosFormateados: Comentario[] = comentarios.map(item => {
                let usuario = undefined;

                if (item.usuario) {
                    if (Array.isArray(item.usuario) && item.usuario.length > 0) {
                        usuario = { nombre: item.usuario[0].nombre };
                    } else if (!Array.isArray(item.usuario)) {
                        usuario = { nombre: (item.usuario as any).nombre };
                    }
                }

                return {
                    id: item.id,
                    contenido: item.contenido || '',
                    created_at: item.created_at,
                    edited_at: item.edited_at,
                    likes_count: item.likes_count || 0,
                    dislikes_count: item.dislikes_count || 0,
                    idUsuario: item.id_usuario,
                    usuario
                };
            });

            setComentarios(comentariosFormateados);
            console.log('✅ Comentarios cargados exitosamente:', comentariosFormateados.length);
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