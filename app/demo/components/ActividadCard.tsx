import React, { useState, useEffect } from 'react';
import { Play, Pause, Calendar, Clock } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';
import { Actividad } from '@/domain/entities/Actividad';
import Ventana from './Ventana';

export default function ActividadCard() {
  const { usuario } = useAuth();
  const { actividades, loading } = useActividades(usuario?.id || null);
  const [showActividadDetails, setShowActividadDetails] = useState(false);

  // Obtener la actividad más reciente
  const actividadActual = actividades.length > 0 ? actividades[0] : null;

  const calculateTimeUntilStart = () => {
    if (!actividadActual?.hora_inicio) return 0;

    try {
      // Parse ISO 8601 format: "2023-09-23T23:00:00+00:00"
      const targetDateTime = new Date(actividadActual.hora_inicio);
      
      // Validate that the date is valid
      if (isNaN(targetDateTime.getTime())) {
        return 0;
      }

      const now = new Date();
      const diffInMs = targetDateTime.getTime() - now.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);

      return diffInSeconds;
    } catch (error) {
      console.error('Error parsing hora_inicio:', actividadActual.hora_inicio, error);
      return 0;
    }
  };

  const [timeInSeconds, setTimeInSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [isActive, setIsActive] = useState(true); // Para el indicador verde

  // Update time when activity changes
  useEffect(() => {
    if (actividadActual) {
      setTimeInSeconds(calculateTimeUntilStart());
      setIsRunning(true);
    } else {
      setTimeInSeconds(0);
      setIsRunning(false);
    }
  }, [actividadActual]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0 && actividadActual) {
      interval = setInterval(() => {
        const newTime = calculateTimeUntilStart();
        setTimeInSeconds(newTime);
        if (newTime === 0) {
          setIsRunning(false);
        }
      }, 1000);
    }
    return () => clearInterval(interval!);
  }, [isRunning, actividadActual]);

  const formatTimer = (seconds: number) => {
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

  const handleShowDetails = () => {
    if (actividadActual) {
      setShowActividadDetails(true);
    }
  };

  const resetTimer = () => {
    if (actividadActual) {
      setTimeInSeconds(calculateTimeUntilStart());
      setIsRunning(true);
    }
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

  const formatDate = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (horaInicio: string | null) => {
    if (!horaInicio) return 'Sin hora';

    try {
      // Parse ISO 8601 and convert to local time
      const date = new Date(horaInicio);
      
      if (isNaN(date.getTime())) {
        return 'Hora inválida';
      }

      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return horaInicio;
    }
  };

  return (
    <>
      <div
        className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-pointer hover:bg-slate-500 transition-colors"
        draggable
        onDragStart={handleDragStart}
        onClick={handleShowDetails}
        title={actividadActual?.descripcion || 'Sin actividad registrada'}
      >

        {/* Franja superior */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

        {/* Indicador de estado */}
        <div className="flex justify-start w-full relative z-10">
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${actividadActual ? 'bg-green-400' : 'bg-gray-400'
              }`}
          />
        </div>

        {/* Tiempo o información de actividad */}
        <div className="flex-1 flex items-center justify-center w-full">
          {actividadActual ? (
            <div className="text-center">
              <div
                className="text-white text-sm font-light tracking-wide cursor-pointer select-none"
                onClick={resetTimer}
                title="Click para resetear timer"
              >
                {formatTimer(timeInSeconds)}
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

        {/* Icono de play decorativo */}
        <div className="flex justify-end w-full">
          <div className="text-white p-1">
            <Play size={12} fill="currentColor" className="ml-0.5" />
          </div>
        </div>
      </div>

      {/* Ventana de detalles de actividad */}
      <Ventana
        isOpen={showActividadDetails}
        onClose={() => setShowActividadDetails(false)}
        title="Detalles del Ticket"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        {actividadActual && (
          <div className="text-black space-y-6 p-4">
            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <p className="text-gray-700">{actividadActual.descripcion || 'Sin descripción'}</p>
            </div>

            {/* Fecha y Hora */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha y Hora</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-medium">{formatDate(actividadActual.fecha)}</p>
                <p className="text-gray-600">{formatTime(actividadActual.hora_inicio)}</p>
              </div>
            </div>

            {/* Duración */}
            {actividadActual.cant_horas && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Duración</h3>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="font-medium text-blue-800">{actividadActual.cant_horas} horas</p>
                </div>
              </div>
            )}

            {/* Tiempo dedicado */}
            {actividadActual.tiempo_dedicado && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tiempo Dedicado</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800">{actividadActual.tiempo_dedicado} minutos</p>
                </div>
              </div>
            )}

            {/* Link */}
            {actividadActual.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enlace</h3>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  onClick={() => window.open(actividadActual.link!, '_blank')}
                >
                  Abrir enlace
                </button>
              </div>
            )}

            {/* Captures */}
            {actividadActual.captures && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Notas</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{actividadActual.captures}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Ventana>
    </>
  );
}
