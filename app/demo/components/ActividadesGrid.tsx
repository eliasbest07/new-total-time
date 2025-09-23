import React, { useState, useEffect } from 'react';
import { Play, Pause, Calendar, Clock } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';
import { Actividad } from '@/domain/entities/Actividad';

interface ActividadCardProps {
  actividad: Actividad;
  index: number;
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, index }) => {
  const [timeInSeconds, setTimeInSeconds] = useState((22 + index) * 60 + 59); // Tiempo diferente para cada card
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        setTimeInSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (timeInSeconds === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval!);
  }, [isRunning, timeInSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setTimeInSeconds((22 + index) * 60 + 59);
    setIsRunning(false);
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
      className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-grab active:cursor-grabbing hover:bg-slate-500 transition-colors"
      draggable
      onDragStart={handleDragStart}
      title={`${actividad.descripcion || 'Sin descripción'} - ${formatDate(actividad.fecha)}`}
    >
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>
      
      {/* Indicador de estado */}
      <div className="flex justify-start w-full relative z-10">
        <div className="w-3 h-3 rounded-full bg-green-400 transition-colors duration-300" />
      </div>

      {/* Tiempo e información de actividad */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <div 
            className="text-white text-xs font-light tracking-wide cursor-pointer select-none"
            onClick={resetTimer}
            title="Click para resetear timer"
          >
            {formatTime(timeInSeconds)}
          </div>
          {actividad.cant_horas && (
            <div className="text-white/70 text-xs">
              {actividad.cant_horas}h
            </div>
          )}
          {actividad.fecha && (
            <div className="text-white/50 text-xs">
              {formatDate(actividad.fecha)}
            </div>
          )}
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

export default function ActividadesGrid() {
  const { usuario } = useAuth();
  const { actividades, loading, error } = useActividades(usuario?.id || null);

  if (loading) {
    return (
      <div className="flex gap-2">
        <div className="bg-slate-600 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 rounded-xl p-4 text-red-200 text-sm">
        Error: {error}
      </div>
    );
  }

  if (actividades.length === 0) {
    return (
      <div className="bg-slate-600/50 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="text-white/70 text-xs text-center">
          Sin actividades
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {actividades.map((actividad, index) => (
        <ActividadCard 
          key={actividad.id} 
          actividad={actividad} 
          index={index}
        />
      ))}
    </div>
  );
}