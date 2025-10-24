import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { Comentario } from '@/domain/entities/Comentario';

interface UseComentariosReturn {
    comentarios: Comentario[];
    loading: boolean;
    error: string | null;
}

// Hook para cargar comentarios por IDs (método antiguo, mantener por compatibilidad)
export const useComentarios = (comentarioIds: string[] | null): UseComentariosReturn => {
    const [comentarios, setComentarios] = useState<Comentario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ✅ FIX: Convertir el array a string para usarlo como dependencia
    const comentarioIdsStr = JSON.stringify(comentarioIds);

    const loadComentarios = useCallback(async () => {
        const ids = JSON.parse(comentarioIdsStr);

        if (!ids || ids.length === 0) {
            setComentarios([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Obtener comentarios directamente con Supabase
            const { data: comentarios, error } = await supabase
                .from('comentario_sala')
                .select('*')
                .in('id', ids)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Error en consulta de comentarios:', error);
                throw new Error(error.message);
            }

            if (!comentarios || comentarios.length === 0) {
                setComentarios([]);
                return;
            }

            // Obtener los IDs únicos de usuarios - la columna puede ser idUsuario o "idUsuario"
            const userIds = [...new Set(comentarios.map(c => (c as any).idUsuario || (c as any)['idUsuario']).filter(id => id !== null))];

            // Obtener los datos de los usuarios si hay IDs
            let usuariosMap = new Map();
            if (userIds.length > 0) {
                const { data: usuarios, error: userError } = await supabase
                    .from('usuario')
                    .select('id, nombre, avatar')
                    .in('id', userIds);

                if (!userError && usuarios) {
                    usuariosMap = new Map(usuarios.map(u => [u.id, { nombre: u.nombre, avatar: u.avatar }]));
                }
            }

            // Mapear los comentarios al formato esperado
            const comentariosFormateados: Comentario[] = comentarios.map(item => {
                const idUsuario = (item as any).idUsuario || (item as any)['idUsuario'];
                return {
                    id: item.id,
                    contenido: item.contenido || '',
                    created_at: item.created_at,
                    edited_at: item.edited_at,
                    likes_count: item.likes_count || 0,
                    dislikes_count: item.dislikes_count || 0,
                    idUsuario: idUsuario,
                    usuario: idUsuario ? usuariosMap.get(idUsuario) : undefined
                };
            });

            setComentarios(comentariosFormateados);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar comentarios';
            console.error('❌ Error cargando comentarios:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [comentarioIdsStr]);

    useEffect(() => {
        loadComentarios();
    }, [loadComentarios]);

    return {
        comentarios,
        loading,
        error
    };
};

// ✅ NUEVO Hook para cargar comentarios directamente por id_post
export const useComentariosByPostId = (postId: string | null): UseComentariosReturn => {
    const [comentarios, setComentarios] = useState<Comentario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadComentarios = useCallback(async () => {
        if (!postId) {
            setComentarios([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Obtener comentarios por id_post directamente
            const { data: comentariosData, error: comentariosError } = await supabase
                .from('comentario_sala')
                .select('*')
                .eq('id_post', postId)
                .order('created_at', { ascending: true});

            if (comentariosError) {
                console.error('❌ Error en consulta de comentarios:', comentariosError);
                throw new Error(comentariosError.message);
            }

            if (!comentariosData || comentariosData.length === 0) {
                setComentarios([]);
                return;
            }

            // Obtener los IDs únicos de usuarios
            const userIds = [...new Set(comentariosData.map(c => (c as any).idUsuario || (c as any)['idUsuario']).filter(id => id !== null))];

            // Obtener los datos de los usuarios si hay IDs
            let usuariosMap = new Map();
            if (userIds.length > 0) {
                const { data: usuarios, error: userError } = await supabase
                    .from('usuario')
                    .select('id, nombre, avatar')
                    .in('id', userIds);

                if (!userError && usuarios) {
                    usuariosMap = new Map(usuarios.map(u => [u.id, { nombre: u.nombre, avatar: u.avatar }]));
                }
            }

            // Mapear los comentarios al formato esperado
            const comentariosFormateados: Comentario[] = comentariosData.map(item => {
                const idUsuario = (item as any).idUsuario || (item as any)['idUsuario'];
                return {
                    id: item.id,
                    contenido: item.contenido || '',
                    created_at: item.created_at,
                    edited_at: item.edited_at,
                    likes_count: item.likes_count || 0,
                    dislikes_count: item.dislikes_count || 0,
                    idUsuario: idUsuario,
                    usuario: idUsuario ? usuariosMap.get(idUsuario) : undefined
                };
            });

            setComentarios(comentariosFormateados);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar comentarios';
            console.error('❌ Error cargando comentarios:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useEffect(() => {
        loadComentarios();
    }, [loadComentarios]);

    return {
        comentarios,
        loading,
        error
    };
};

// Hook para cargar comentarios por IDs
// Recibe un array de UUIDs de comentarios y los carga desde la DB
export const useComentariosByPost = (comentarioIds: string[] | null): UseComentariosReturn => {
    const [comentarios, setComentarios] = useState<Comentario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Convertir el array a string para usarlo como dependencia
    const comentarioIdsStr = JSON.stringify(comentarioIds);

    const loadComentarios = useCallback(async () => {
        const ids = JSON.parse(comentarioIdsStr);

        if (!ids || ids.length === 0) {
            setComentarios([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // console.log('💬 Cargando comentarios con IDs:', ids);

            // Obtener comentarios por array de IDs
            const { data: comentariosData, error: comentariosError } = await supabase
                .from('comentario_sala')
                .select('*')
                .in('id', ids)
                .order('created_at', { ascending: true });

            // console.log('📊 Respuesta comentarios:', { data: comentariosData, error: comentariosError });

            if (comentariosError) {
                console.error('❌ Error en consulta de comentarios:', comentariosError);
                throw new Error(comentariosError.message);
            }

            if (!comentariosData || comentariosData.length === 0) {
                // console.log('⚠️ No se encontraron comentarios para el post');
                setComentarios([]);
                return;
            }

            // console.log('✅ Comentarios obtenidos:', comentariosData.length);

            // Obtener los IDs únicos de usuarios
            const userIds = [...new Set(comentariosData.map(c => (c as any).idUsuario || (c as any)['idUsuario']).filter(id => id !== null))];
            // console.log('👥 IDs de usuarios a buscar:', userIds);

            // Obtener los datos de los usuarios si hay IDs
            let usuariosMap = new Map();
            if (userIds.length > 0) {
                const { data: usuarios, error: userError } = await supabase
                    .from('usuario')
                    .select('id, nombre')
                    .in('id', userIds);

                // console.log('📊 Respuesta usuarios:', { data: usuarios, error: userError });

                if (!userError && usuarios) {
                    usuariosMap = new Map(usuarios.map(u => [u.id, { nombre: u.nombre }]));
                }
            }

            // Mapear los comentarios al formato esperado
            const comentariosFormateados: Comentario[] = comentariosData.map(item => {
                const idUsuario = (item as any).idUsuario || (item as any)['idUsuario'];
                return {
                    id: item.id,
                    contenido: item.contenido || '',
                    created_at: item.created_at,
                    edited_at: item.edited_at,
                    likes_count: item.likes_count || 0,
                    dislikes_count: item.dislikes_count || 0,
                    idUsuario: idUsuario,
                    usuario: idUsuario ? usuariosMap.get(idUsuario) : undefined
                };
            });

            setComentarios(comentariosFormateados);
            // console.log('✅ Comentarios cargados exitosamente:', comentariosFormateados.length);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar comentarios';
            console.error('❌ Error cargando comentarios:', errorMessage);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [comentarioIdsStr]);

    useEffect(() => {
        loadComentarios();
    }, [loadComentarios]);

    return {
        comentarios,
        loading,
        error
    };
};