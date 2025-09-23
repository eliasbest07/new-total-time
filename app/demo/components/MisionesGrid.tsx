import React from 'react';
import { Target, Clock, Calendar } from 'lucide-react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { Mision } from '@/domain/entities/Mision';

interface MisionCardProps {
  mision: Mision;
  onClick?: () => void;
}

const MisionCard: React.FC<MisionCardProps> = ({ mision, onClick }) => {
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

  const formatDate = (fecha: string | null) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getStatusColor = () => {
    if (!mision.fecha_start || !mision.fecha_end) return 'bg-gray-500';

    const now = new Date();
    const start = new Date(mision.fecha_start);
    const end = new Date(mision.fecha_end);

    if (now < start) return 'bg-blue-500'; // Pendiente
    if (now > end) return 'bg-gray-500'; // Completada/Vencida
    return 'bg-green-500'; // En progreso
  };

  return (
    <div
      className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-48 cursor-grab active:cursor-grabbing hover:bg-white/15 transition-colors border border-white/10"
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      title={mision.descripcion || mision.nombre || 'Sin descripción'}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-white/70" />
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        </div>
        {mision.horas && (
          <div className="flex items-center gap-1 text-white/70 text-xs">
            <Clock className="w-3 h-3" />
            {mision.horas}h
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-white font-medium text-sm line-clamp-2">
          {mision.nombre || 'Sin nombre'}
        </h3>

        {mision.descripcion && (
          <p className="text-white/70 text-xs line-clamp-2">
            {mision.descripcion}
          </p>
        )}

        <div className="flex items-center justify-between text-xs text-white/50">
          {mision.fecha_start && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(mision.fecha_start)}
            </div>
          )}
          {mision.fecha_end && (
            <div className="text-right">
              → {formatDate(mision.fecha_end)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function MisionesGrid() {
  // Obtener el ID numérico del usuario desde la tabla usuario
  const { usuarioId, loading: loadingUsuario, error: errorUsuario } = useUsuarioId();
  const { misiones, loading: loadingMisiones, error: errorMisiones } = useMisiones(usuarioId);

  console.log('🔍 ID numérico del usuario:', usuarioId);

  const loading = loadingUsuario || loadingMisiones;
  const error = errorUsuario || errorMisiones;

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-48 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 rounded-xl p-4 text-red-200 text-sm min-w-48">
        Error: {error}
      </div>
    );
  }

  if (misiones.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 min-w-48 flex items-center justify-center">
        <div className="text-white/70 text-xs text-center">
          <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
          Sin misiones
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {misiones.map((mision) => (
        <MisionCard
          key={mision.id}
          mision={mision}
          onClick={() => {
            // Aquí puedes agregar lógica para mostrar detalles de la misión
            console.log('Misión seleccionada:', mision);
          }}
        />
      ))}
    </div>
  );
}