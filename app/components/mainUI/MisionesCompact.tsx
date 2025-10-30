import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useAuth } from '@/app/contexts/AuthContext';
import { Mision } from '@/domain/entities/Mision';

interface MisionCompactCardProps {
  mision: Mision;
  onClick?: () => void;
}

interface MisionesCompactProps {
  onShowDetails?: (mision: Mision) => void;
}

const MisionCompactCard: React.FC<MisionCompactCardProps> = ({ mision, onClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    console.log('Drag started for mission:', mision.nombre);
    console.log('🔍 [MisionCompactCard] id_creador en misión:', mision.id_creador);
    console.log('🔍 [MisionCompactCard] id_usuario en misión:', mision.id_usuario);
    console.log('🔍 [MisionCompactCard] card_todos en misión:', mision.card_todos);
    const misionData = {
      type: 'mision',
      title: mision.nombre || 'Sin nombre',
      description: mision.descripcion || '',
      hours: mision.horas || 0,
      fechaStart: mision.fecha_start,
      fechaEnd: mision.fecha_end,
      id: mision.id,
      id_usuario: mision.id_usuario,
      id_creador: mision.id_creador, // UUID del creador de la misión
      card_todos: mision.card_todos || [] // Array de UUIDs de cards TODO
    };

    e.dataTransfer.setData('application/json', JSON.stringify(misionData));
    e.dataTransfer.setData('text/plain', `Misión - ${mision.nombre || 'Sin nombre'}`);
    console.log('Drag data set:', misionData);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('MisionCompactCard clicked:', mision.nombre);
    if (onClick) {
      onClick();
    }
  };

  return (
    <div 
      className="relative bg-green-600 w-19 h-19 rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing hover:bg-green-500 transition-colors"
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      title={mision.descripcion || mision.nombre || 'Sin descripción'}
    >
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-green-800 rounded-t-xl"></div>
      
      {/* Ticker text container */}
      <div className="absolute top-6 left-2 right-2 bottom-6 overflow-hidden flex items-center">
        <div className="ticker-wrapper h-full flex items-center">
          <div className="ticker-content-continuous">
            <span className="ticker-text">{mision.nombre || 'Sin nombre'}</span>
            <span className="ticker-text">{mision.nombre || 'Sin nombre'}</span>
          </div>
        </div>
      </div>
      
      {/* Hours indicator in corner */}
      {mision.horas && (
        <div className="absolute bottom-1 right-1 bg-green-800 rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{mision.horas}h</span>
        </div>
      )}
      

      <style jsx>{`
        .ticker-wrapper {
          display: flex;
          align-items: center;
          overflow: hidden;
        }
        
        .ticker-content-continuous {
          animation: scroll-left-seamless 20s linear infinite;
          display: flex;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1;
          color: #ffffff;
          white-space: nowrap;
        }
        
        .ticker-text {
          padding: 0 20px;
          display: inline-block;
        }
        
        .ticker-text:after {
          content: " • ";
          color: rgba(255, 255, 255, 0.6);
        }
        
        @keyframes scroll-left-seamless {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};

export default function MisionesCompact({ onShowDetails }: MisionesCompactProps) {
  const { usuarioId, loading: loadingUsuario, error: errorUsuario } = useUsuarioId();
  const { usuario } = useAuth();
  const { misiones, loading: loadingMisiones, error: errorMisiones } = useMisiones(usuarioId);
  const { getMisionesEntregadas } = useMisionActiva();

  const [currentPage, setCurrentPage] = useState(0);
  const [idsEntregadas, setIdsEntregadas] = useState<number[]>([]);
  const itemsPerPage = 2;

  // Cargar IDs de misiones entregadas
  useEffect(() => {
    const loadEntregadas = async () => {
      if (!usuario?.id) return;
      const entregadas = await getMisionesEntregadas(usuario.id);
      // Extraer los id_referencia de tipo 'mision'
      const ids = entregadas
        .filter(e => e.tipo === 'mision')
        .map(e => e.id_referencia);
      setIdsEntregadas(ids);
    };
    loadEntregadas();
  }, [usuario?.id, getMisionesEntregadas]);

  // Filtrar misiones que NO han sido entregadas
  const misionesPendientes = useMemo(() => {
    return misiones.filter(m => !idsEntregadas.includes(m.id));
  }, [misiones, idsEntregadas]);

  const totalPages = Math.ceil(misionesPendientes.length / itemsPerPage);
  const loading = loadingUsuario || loadingMisiones;
  const error = errorUsuario || errorMisiones;

  if (loading) {
    return (
      <div className="relative bg-green-600 w-19 h-19 rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative bg-green-600/50 w-19 h-19 rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
        <div className="text-white/70 text-xs text-center">Error</div>
      </div>
    );
  }

  if (misionesPendientes.length === 0) {
    return (
      <div className="relative bg-green-600/50 w-19 h-19 rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
        <div className="text-white/70 text-xs text-center">Sin misiones</div>
      </div>
    );
  }

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMisiones = misionesPendientes.slice(startIndex, endIndex);

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;

  return (
    <div className="flex items-center gap-2">
      {/* Botón anterior */}
      {misionesPendientes.length > itemsPerPage && (
        <button
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className={`rounded-lg p-1 transition-colors ${
            canGoPrev
              ? 'bg-green-600/50 hover:bg-green-600 cursor-pointer'
              : 'bg-green-600/20 cursor-not-allowed opacity-50'
          }`}
          title="Anterior"
        >
          <ChevronLeft size={16} className="text-white" />
        </button>
      )}

      {/* Cards de misiones */}
      <div className="flex gap-2">
        {currentMisiones.map((mision) => (
          <MisionCompactCard
            key={mision.id}
            mision={mision}
            onClick={() => {
              console.log('Misión seleccionada:', mision);
              console.log('onShowDetails function:', onShowDetails);
              if (onShowDetails) {
                onShowDetails(mision);
              }
            }}
          />
        ))}
      </div>

      {/* Botón siguiente */}
      {misionesPendientes.length > itemsPerPage && (
        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          className={`rounded-lg p-1 transition-colors ${
            canGoNext
              ? 'bg-green-600/50 hover:bg-green-600 cursor-pointer'
              : 'bg-green-600/20 cursor-not-allowed opacity-50'
          }`}
          title="Siguiente"
        >
          <ChevronRight size={16} className="text-white" />
        </button>
      )}
    </div>
  );
}