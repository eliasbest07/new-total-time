import React from 'react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { Mision } from '@/domain/entities/Mision';

interface MisionCompactCardProps {
  mision: Mision;
  onClick?: () => void;
}

const MisionCompactCard: React.FC<MisionCompactCardProps> = ({ mision, onClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
    const misionData = {
      type: 'mision',
      title: mision.nombre || 'Sin nombre',
      description: mision.descripcion || '',
      hours: mision.horas || 0,
      fechaStart: mision.fecha_start,
      fechaEnd: mision.fecha_end,
      id: mision.id
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(misionData));
    e.dataTransfer.setData('text/plain', `Misión - ${mision.nombre || 'Sin nombre'}`);
  };

  return (
    <div 
      className="relative bg-green-600 w-19 h-19 rounded-xl shadow-lg overflow-hidden cursor-grab active:cursor-grabbing hover:bg-green-500 transition-colors"
      onClick={onClick}
      draggable
      onDragStart={handleDragStart}
      title={mision.descripcion || mision.nombre || 'Sin descripción'}
    >
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-green-800 rounded-t-xl"></div>
      
      {/* Ticker text container */}
      <div className="absolute top-6 left-2 right-2 bottom-6 overflow-hidden flex items-center justify-center">
        <div className="text-white text-xs font-medium text-center px-1">
          {mision.nombre || 'Sin nombre'}
        </div>
      </div>
      
      {/* Hours indicator in corner */}
      {mision.horas && (
        <div className="absolute bottom-1 right-1 bg-green-800 rounded-full w-6 h-6 flex items-center justify-center">
          <span className="text-white text-xs font-bold">{mision.horas}h</span>
        </div>
      )}
      
      {/* Drag area - invisible overlay for better drag experience */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing"></div>

    </div>
  );
};

export default function MisionesCompact() {
  const { usuarioId, loading: loadingUsuario, error: errorUsuario } = useUsuarioId();
  const { misiones, loading: loadingMisiones, error: errorMisiones } = useMisiones(usuarioId);

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

  if (misiones.length === 0) {
    return (
      <div className="relative bg-green-600/50 w-19 h-19 rounded-xl shadow-lg overflow-hidden flex items-center justify-center">
        <div className="text-white/70 text-xs text-center">Sin misiones</div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {misiones.slice(0, 3).map((mision) => (
        <MisionCompactCard 
          key={mision.id} 
          mision={mision}
          onClick={() => {
            console.log('Misión seleccionada:', mision);
          }}
        />
      ))}
    </div>
  );
}