import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { Actividad } from '@/domain/entities/Actividad';

interface ActividadCardProps {
  actividad: Actividad;
  index: number;
  onShowDetails: (actividad: Actividad) => void;
}

interface ActividadesGridMockProps {
  actividades: Actividad[];
  onShowDetails: (actividad: Actividad) => void;
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, index, onShowDetails }) => {
  const calculateTimeUntilStart = () => {
    if (!actividad.hora_inicio) return 0;

    try {
      const targetDateTime = new Date(actividad.hora_inicio);

      if (isNaN(targetDateTime.getTime())) {
        return 0;
      }

      const now = new Date();
      const diffInMs = targetDateTime.getTime() - now.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);

      return diffInSeconds;
    } catch (error) {
      console.error('Error parsing hora_inicio:', actividad.hora_inicio, error);
      return 0;
    }
  };

  const [timeInSeconds, setTimeInSeconds] = useState(calculateTimeUntilStart);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        const newTime = calculateTimeUntilStart();
        setTimeInSeconds(newTime);
        if (newTime === 0) {
          setIsRunning(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval!);
  }, [isRunning, actividad.hora_inicio]);

  const formatTime = (seconds: number) => {
    if (seconds < 0) {
      return '--:--';
    }

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}`;
  };

  const handleShowDetails = (e: React.MouseEvent) => {
    // Evitar abrir detalles si se hizo click en botones
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onShowDetails(actividad);
  };

  const handlePlayPause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('🎬 [DEMO] Play/Pause presionado - Mock mode');
    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
  };

  const resetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimeInSeconds(calculateTimeUntilStart());
    setIsRunning(true);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const activityData = {
      type: 'actividad',
      subject: actividad.descripcion || 'Sin descripción',
      date: actividad.fecha || new Date().toISOString().split('T')[0],
      time: actividad.hora_inicio || 'Sin hora definida',
      duration: actividad.cant_horas || 0,
      timeLeft: timeInSeconds,
      captures: actividad.captures || '',
      link: actividad.link || '',
      id: actividad.id
    };

    e.dataTransfer.setData('application/json', JSON.stringify(activityData));
    e.dataTransfer.setData('text/plain', `Actividad - ${actividad.descripcion || 'Sin descripción'}`);
  };

  const formatDate = (fecha: string | null) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  return (
    <div
      className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-pointer hover:bg-slate-500 transition-colors"
      draggable
      onDragStart={handleDragStart}
      onClick={handleShowDetails}
      title={`${actividad.descripcion || 'Sin descripción'} - ${formatDate(actividad.fecha)}`}
    >
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

      {/* Indicador de estado */}
      <div className="flex justify-between w-full relative z-10 items-center">
        <div
          className={`w-3 h-3 rounded-full transition-colors duration-300 bg-green-400`}
        />
      </div>

      {/* Tiempo e información de actividad */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <div
            className="text-white text-base tracking-wide cursor-pointer select-none"
            onClick={resetTimer}
            title="Click para resetear timer"
          >
            {formatTime(timeInSeconds)}
          </div>
        </div>
      </div>

      {/* Botón de play/pause */}
      <div className="flex justify-end w-full">
        <button
          onClick={handlePlayPause}
          className="text-white hover:text-gray-300 transition-colors duration-200 p-1 hover:bg-slate-500 rounded-lg"
          aria-label={isRunning ? "Pausar timer" : "Iniciar timer"}
        >
          {isRunning ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default function ActividadesGridMock({ actividades, onShowDetails }: ActividadesGridMockProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(actividades.length / itemsPerPage);

  if (actividades.length === 0) {
    return (
      <div className="bg-slate-600/50 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="text-white/70 text-xs text-center">
          Sin actividades
        </div>
      </div>
    );
  }

  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentActividades = actividades.slice(startIndex, endIndex);

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
      {actividades.length > itemsPerPage && (
        <button
          onClick={handlePrevPage}
          disabled={!canGoPrev}
          className={`rounded-lg p-1 transition-colors ${
            canGoPrev
              ? 'bg-slate-600/50 hover:bg-slate-600 cursor-pointer'
              : 'bg-slate-600/20 cursor-not-allowed opacity-50'
          }`}
          title="Anterior"
        >
          <ChevronLeft size={16} className="text-white" />
        </button>
      )}

      {/* Cards de actividades */}
      <div className="flex gap-2">
        {currentActividades.map((actividad, index) => (
          <ActividadCard
            key={actividad.id}
            actividad={actividad}
            index={startIndex + index}
            onShowDetails={onShowDetails}
          />
        ))}
      </div>

      {/* Botón siguiente */}
      {actividades.length > itemsPerPage && (
        <button
          onClick={handleNextPage}
          disabled={!canGoNext}
          className={`rounded-lg p-1 transition-colors ${
            canGoNext
              ? 'bg-slate-600/50 hover:bg-slate-600 cursor-pointer'
              : 'bg-slate-600/20 cursor-not-allowed opacity-50'
          }`}
          title="Siguiente"
        >
          <ChevronRight size={16} className="text-white" />
        </button>
      )}
    </div>
  );
}
