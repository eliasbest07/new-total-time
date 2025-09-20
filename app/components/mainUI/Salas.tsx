"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useSalas } from "@/hooks/useSalas";

export default function Salas() {
  const { usuario } = useAuth();
  const { salas, loading, error, setSalaActiva, salaActiva } = useSalas(usuario?.idOrganizacion || null);

  // Usar datos reales del hook
  const salasToShow = salas;
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxVisible = 3;

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex + maxVisible < salasToShow.length;

  const scrollLeft = () => {
    if (canScrollLeft) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const scrollRight = () => {
    if (canScrollRight) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSalaClick = (salaId: number) => {
    setSalaActiva(salaId);
    console.log('🎯 Sala seleccionada:', salaId);
  };

  const usingRealData = !loading && salas.length > 0;

  // Mostrar loading o error si es necesario
  if (loading) {
    return (
      <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 w-[340px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-700"></div>
          <span className="ml-2 text-gray-700">Cargando salas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-red-100/80 backdrop-blur-sm rounded-full p-2 w-[340px] flex items-center justify-center">
          <span className="text-red-700 text-sm">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (salasToShow.length === 0) {
    return (
      <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 w-[340px] flex items-center justify-center">
          <span className="text-gray-700 text-sm">No hay salas disponibles</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2 z-30">
      {canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 transition-all duration-200 backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4 text-gray-700" />
        </button>
      )}

      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 overflow-hidden w-[340px] relative">
        {/* Indicador de datos reales vs mock */}
        <div className={`absolute -top-2 -right-2 w-3 h-3 rounded-full ${usingRealData ? 'bg-green-500' : 'bg-orange-500'
          }`} title={usingRealData ? 'Datos en tiempo real' : loading ? 'Cargando...' : 'Sin datos'} />

        <div
          className="flex gap-1 transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * 120}px)`,
            width: `${salasToShow.length * 120}px`
          }}
        >
          {salasToShow.map((sala) => (
            <button
              key={sala.id}
              onClick={() => handleSalaClick(sala.id)}
              className={`px-3 py-2 rounded-full font-medium transition-all duration-200 whitespace-nowrap min-w-[12px] max-w-[112px] overflow-hidden text-ellipsis ${salaActiva?.id === sala.id
                  ? "bg-green-200 text-gray-800"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              title={sala.nombre || 'Sala sin nombre'}
            >
              {sala.nombre || 'Sin nombre'}
            </button>
          ))}
          <div className="w-2"></div>
        </div>
      </div>

      {canScrollRight && (
        <button
          onClick={scrollRight}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-white/30 hover:bg-white/40 transition-all duration-200 backdrop-blur-sm"
        >
          <ChevronRight className="w-4 h-4 text-gray-700" />
        </button>
      )}
    </div>
  );
}