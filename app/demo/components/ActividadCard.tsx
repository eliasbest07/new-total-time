import React, { useState, useEffect } from 'react';
import { Play, Pause, Calendar, Clock } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ActividadCard() {
  const { usuario } = useAuth();
  const { actividades, loading } = useActividades(usuario?.id || null);
  const [timeInSeconds, setTimeInSeconds] = useState(22 * 60 + 59); // 22:59 inicial
  const [isRunning, setIsRunning] = useState(false);
  const [isActive, setIsActive] = useState(true); // Para el indicador verde
  
  // Obtener la actividad más reciente
  const actividadActual = actividades.length > 0 ? actividades[0] : null;

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
    setTimeInSeconds(22 * 60 + 59);
    setIsRunning(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const activityData = {
      type: 'actividad',
      subject: actividadActual?.descripcion || 'Sin actividad registrada',
      date: actividadActual?.fecha || new Date().toISOString().split('T')[0],
      time: actividadActual?.hora_inicio || 'Sin hora definida',
      duration: actividadActual?.cant_horas || 0,
      timeLeft: timeInSeconds,
      captures: actividadActual?.captures || '',
      link: actividadActual?.link || ''
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(activityData));
    e.dataTransfer.setData('text/plain', `Actividad - ${actividadActual?.descripcion || 'Sin descripción'}`);
  };

  if (loading) {
    return (
      <div className="bg-slate-600 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-grab active:cursor-grabbing"
      draggable
      onDragStart={handleDragStart}
      title={actividadActual?.descripcion || 'Sin actividad registrada'}
    >
    
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>
      
      {/* Indicador de estado */}
      <div className="flex justify-start w-full relative z-10">
        <div 
          className={`w-3 h-3 rounded-full transition-colors duration-300 ${
            actividadActual ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      </div>

      {/* Tiempo o información de actividad */}
      <div className="flex-1 flex items-center justify-center w-full">
        {actividadActual ? (
          <div className="text-center">
            <div 
              className="text-white text-xs font-light tracking-wide cursor-pointer select-none"
              onClick={resetTimer}
              title="Click para resetear timer"
            >
              {formatTime(timeInSeconds)}
            </div>
            {actividadActual.cant_horas && (
              <div className="text-white/70 text-xs">
                {actividadActual.cant_horas}h
              </div>
            )}
          </div>
        ) : (
          <div className="text-white/70 text-xs text-center">
            Sin actividad
          </div>
        )}
      </div>

      {/* Botón de play/pause */}
      <div className="flex justify-end w-full">
        <button
          onClick={handlePlayPause}
          className="text-white hover:text-gray-300 transition-colors duration-200 p-1 hover:bg-slate-500 rounded-lg"
          aria-label={isRunning ? "Pausar timer" : "Iniciar timer"}
          disabled={!actividadActual}
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
}