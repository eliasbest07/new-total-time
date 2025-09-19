import { useState, useEffect } from 'react';
import { Sala } from '@/domain/entities/Sala';
import { SalaRepository } from '@/infrastructure/repositories/SalaRepository';
import { useAuth } from '@/app/contexts/AuthContext';

export function useSalas() {
  const [salas, setSalas] = useState<Sala[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { usuario } = useAuth();
  const salaRepository = new SalaRepository();

  const cargarSalas = async () => {
    if (!usuario?.idOrganizacion) {
      console.log('ℹ️ No hay organización para cargar salas');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 Cargando salas para organización:', usuario.idOrganizacion);
      
      const salasData = await salaRepository.getSalasByOrganizacion(usuario.idOrganizacion);
      setSalas(salasData);
      
      console.log('✅ Salas cargadas exitosamente:', salasData.length);
    } catch (err) {
      console.error('❌ Error cargando salas:', err);
      setError('Error al cargar las salas');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar salas cuando el usuario cambie
  useEffect(() => {
    cargarSalas();
  }, [usuario?.idOrganizacion]);

  const setSalaActiva = (salaId: number) => {
    setSalas(prevSalas => 
      prevSalas.map(sala => ({
        ...sala,
        activa: sala.id === salaId
      }))
    );
  };

  const getSalaActiva = () => {
    return salas.find(sala => sala.activa);
  };

  return {
    salas,
    isLoading,
    error,
    cargarSalas,
    setSalaActiva,
    getSalaActiva
  };
}