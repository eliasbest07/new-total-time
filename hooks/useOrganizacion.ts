import { useState, useEffect } from 'react';
import { Organizacion } from '@/domain/entities/Organizacion';
import { SupabaseOrganizacionRepository } from '@/infrastructure/datasource/SupabaseOrganizacionRepository';

const organizacionRepository = new SupabaseOrganizacionRepository();

export const useOrganizacion = (userId: string | null) => {
  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrganizacion = async () => {
      if (!userId) {
        setOrganizacion(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await organizacionRepository.getByUsuarioId(userId);
        setOrganizacion(data);
      } catch (err: any) {
        // console.error('❌ Error cargando organización:', err);
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    loadOrganizacion();
  }, [userId]);

  return { organizacion, loading, error };
};
