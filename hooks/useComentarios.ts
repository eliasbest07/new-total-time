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
            console.log('🔍 Consultando tabla comentario_sala...');
            const { data: comentarios, error } = await supabase
                .from('comentario_sala')
                .select('*')
                .in('id', comentarioIds)
                .order('created_at', { ascending: true });

            console.log('📊 Respuesta de comentario_sala:', { data: comentarios, error });

            if (error) {
                console.error('❌ Error en consulta de comentarios:', error);
                throw new Error(error.message);
            }

            if (!comentarios || comentarios.length === 0) {
                console.log('⚠️ No se encontraron comentarios');
                setComentarios([]);
                return;
            }

            console.log('✅ Comentarios obtenidos:', comentarios.length);
            console.log('📝 Primer comentario (estructura):', comentarios[0]);

            // Obtener los IDs únicos de usuarios - la columna puede ser idUsuario o "idUsuario"
            const userIds = [...new Set(comentarios.map(c => (c as any).idUsuario || (c as any)['idUsuario']).filter(id => id !== null))];
            console.log('👥 IDs de usuarios a buscar:', userIds);

            // Obtener los datos de los usuarios si hay IDs
            let usuariosMap = new Map();
            if (userIds.length > 0) {
                console.log('🔍 Consultando tabla usuario...');
                const { data: usuarios, error: userError } = await supabase
                    .from('usuario')
                    .select('id, nombre')
                    .in('id', userIds);

                console.log('📊 Respuesta de usuario:', { data: usuarios, error: userError });

                if (!userError && usuarios) {
                    usuariosMap = new Map(usuarios.map(u => [u.id, { nombre: u.nombre }]));
                    console.log('✅ Usuarios mapeados:', usuariosMap.size);
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