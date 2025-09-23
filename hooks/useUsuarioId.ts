import { useState, useEffect } from 'react';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { useAuth } from '@/app/contexts/AuthContext';

export const useUsuarioId = (): { usuarioId: number | null; loading: boolean; error: string | null } => {
  const { usuario } = useAuth();
  const [usuarioId, setUsuarioId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUsuarioId = async () => {
      if (!usuario?.id) {
        setUsuarioId(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Buscando ID numérico para usuario UUID:', usuario.id);
        console.log('🔍 Tipo de usuario.id:', typeof usuario.id);

        const { data, error } = await supabase
          .from('usuario')
          .select('id, id_usuario, nombre, correo')
          .eq('id_usuario', usuario.id)
          .single();

        console.log('🔍 Respuesta de Supabase:', { data, error });

        if (error) {
          console.error('❌ Error obteniendo ID numérico del usuario:', error);
          console.error('❌ Detalles del error:', error.message, error.code, error.details);
          setError(`Error obteniendo ID del usuario: ${error.message}`);
          setUsuarioId(null);
          return;
        }

        if (!data) {
          console.error('❌ No se encontró usuario en la tabla usuario');
          setError('Usuario no encontrado en la tabla usuario');
          setUsuarioId(null);
          return;
        }

        console.log('✅ Usuario encontrado:', data);
        console.log('✅ ID numérico encontrado:', data.id);
        console.log('✅ Tipo de ID numérico:', typeof data.id);
        setUsuarioId(data.id);
      } catch (err) {
        console.error('❌ Error en useUsuarioId:', err);
        setError('Error desconocido');
        setUsuarioId(null);
      } finally {
        setLoading(false);
      }
    };

    getUsuarioId();
  }, [usuario?.id]);

  return { usuarioId, loading, error };
};