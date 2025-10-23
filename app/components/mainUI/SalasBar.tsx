"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useSalas } from '@/hooks/useSalas';
import { RefreshCw } from 'lucide-react';
import Ventana from '@/app/demo/components/Ventana';
import SalaDetalle from './SalaDetalle';
import { Sala } from '@/domain/entities/Sala';

const RELOAD_COOLDOWN = 30 * 60 * 1000; // 30 minutos en milisegundos

export default function SalasBar() {
  const { usuario } = useAuth();
  const { salas, loading, refetch } = useSalas(usuario?.idOrganizacion || null);

  const [lastReloadTime, setLastReloadTime] = useState<number>(0);
  const [canReload, setCanReload] = useState(true);
  const [selectedSala, setSelectedSala] = useState<Sala | null>(null);
  const [showSalaModal, setShowSalaModal] = useState(false);

  // Verificar si puede recargar basado en el último tiempo de recarga
  useEffect(() => {
    const savedLastReload = localStorage.getItem('salas-last-reload');
    if (savedLastReload) {
      const lastTime = parseInt(savedLastReload, 10);
      setLastReloadTime(lastTime);

      const now = Date.now();
      const timePassed = now - lastTime;

      if (timePassed < RELOAD_COOLDOWN) {
        setCanReload(false);
        // Configurar timer para habilitar recarga cuando pasen los 30 min
        const timeRemaining = RELOAD_COOLDOWN - timePassed;
        const timer = setTimeout(() => {
          setCanReload(true);
        }, timeRemaining);

        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleReload = async () => {
    if (!canReload) {
      const now = Date.now();
      const timePassed = now - lastReloadTime;
      const timeRemaining = RELOAD_COOLDOWN - timePassed;
      const minutesRemaining = Math.ceil(timeRemaining / (60 * 1000));

      alert(`⏰ Debes esperar ${minutesRemaining} minutos más para recargar las salas`);
      return;
    }

    const now = Date.now();
    setLastReloadTime(now);
    localStorage.setItem('salas-last-reload', now.toString());
    setCanReload(false);

    await refetch();

    // Configurar timer para habilitar recarga en 30 min
    setTimeout(() => {
      setCanReload(true);
    }, RELOAD_COOLDOWN);
  };

  const handleSalaClick = (sala: Sala) => {
    setSelectedSala(sala);
    setShowSalaModal(true);
  };

  if (!usuario || salas.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg px-4 py-3 flex items-center gap-4">
        {/* Botón de recargar */}
        <button
          onClick={handleReload}
          disabled={loading || !canReload}
          className={`flex items-center justify-center p-2 rounded-lg transition-all ${
            canReload
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
          title={canReload ? 'Recargar salas' : 'Debes esperar 30 minutos'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>

        {/* Separador */}
        <div className="w-px h-10 bg-gray-300" />

        {/* Lista de salas con scroll horizontal */}
        <div className="flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 pr-2">
          {salas.map((sala) => (
            <button
              key={sala.id}
              onClick={() => handleSalaClick(sala)}
              className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all shadow-sm hover:shadow-md whitespace-nowrap font-medium"
            >
              🏠 {sala.nombre || `Sala ${sala.id}`}
            </button>
          ))}
        </div>
      </div>

      {/* Modal de Sala */}
      <Ventana
        isOpen={showSalaModal}
        onClose={() => {
          setShowSalaModal(false);
          setSelectedSala(null);
        }}
        title={selectedSala?.nombre || 'Sala'}
        initialWidth={800}
        initialHeight={600}
        minWidth={600}
        minHeight={400}
        showOverlay={true}
      >
        {selectedSala && (
          <SalaDetalle sala={selectedSala} />
        )}
      </Ventana>

      <style jsx>{`
        .scrollbar-thin::-webkit-scrollbar {
          height: 6px;
        }

        .scrollbar-thumb-gray-400::-webkit-scrollbar-thumb {
          background-color: #9ca3af;
          border-radius: 3px;
        }

        .scrollbar-track-gray-200::-webkit-scrollbar-track {
          background-color: #e5e7eb;
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}
