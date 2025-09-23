import React, { useState, useEffect } from 'react';
import { Play, Pause, Calendar, Clock } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';
import { Actividad } from '@/domain/entities/Actividad';
import Ventana from './Ventana';

interface ActividadCardProps {
  actividad: Actividad;
  index: number;
  onShowDetails: (actividad: Actividad) => void;
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, index, onShowDetails }) => {
  const calculateTimeUntilStart = () => {
    if (!actividad.hora_inicio) return 0;

    console.log('🕐 Raw hora_inicio:', actividad.hora_inicio);
    console.log('🕐 Type:', typeof actividad.hora_inicio);

    try {
      // Parse ISO 8601 format: "2023-09-23T23:00:00+00:00"
      const targetDateTime = new Date(actividad.hora_inicio);
      
      console.log('📅 Parsed date:', targetDateTime);
      console.log('📅 Date valid?', !isNaN(targetDateTime.getTime()));
      
      // Validate that the date is valid
      if (isNaN(targetDateTime.getTime())) {
        console.log('❌ Invalid date detected');
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

  const handleShowDetails = () => {
    onShowDetails(actividad);
  };

  const resetTimer = () => {
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
      <div className="flex justify-start w-full relative z-10">
        <div className="w-3 h-3 rounded-full bg-green-400 transition-colors duration-300" />
      </div>

      {/* Tiempo e información de actividad */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <div
            className="text-white text-base tracking-wide cursor-pointer select-none"
            onClick={resetTimer}

          >
            {formatTime(timeInSeconds)}
          </div>


        </div>
      </div>

      {/* Icono de play decorativo */}
      <div className="flex justify-end w-full">
        <div className="text-white p-1">
          <Play size={12} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
    </div>
  );
};

export default function ActividadesGrid() {
  const { usuario } = useAuth();
  const { actividades, loading, error } = useActividades(usuario?.id || null);
  const [showActividadDetails, setShowActividadDetails] = useState(false);
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);

  const handleShowDetails = (actividad: Actividad) => {
    setSelectedActividad(actividad);
    setShowActividadDetails(true);
  };

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

    console.log('🕐 formatTime input:', horaInicio);

    try {
      // Parse ISO 8601 and convert to local time
      const date = new Date(horaInicio);
      
      console.log('📅 formatTime parsed date:', date);
      console.log('📅 formatTime date valid?', !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) {
        console.log('❌ formatTime returning 00:00 due to invalid date');
        return '00:00';
      }

      const formatted = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log('✅ formatTime result:', formatted);
      return formatted;
    } catch (error) {
      console.log('❌ formatTime catch error:', error);
      return horaInicio;
    }
  };

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
    <>
      <div className="flex gap-2 flex-wrap">
        {actividades.map((actividad, index) => (
          <ActividadCard
            key={actividad.id}
            actividad={actividad}
            index={index}
            onShowDetails={handleShowDetails}
          />
        ))}
      </div>

      {/* Ventana de detalles de actividad */}
      <Ventana
        isOpen={showActividadDetails}
        onClose={() => setShowActividadDetails(false)}
        title="Detalles de la Actividad"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        {selectedActividad && (
          <div className="text-black space-y-6 p-4">
            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <p className="text-gray-700">{selectedActividad.descripcion || 'Sin descripción'}</p>
            </div>

            {/* Fecha y Hora */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha y Hora</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-medium">{formatDate(selectedActividad.fecha)}</p>
                <p className="text-gray-600">{formatTime(selectedActividad.hora_inicio)}</p>
              </div>
            </div>

            {/* Duración */}
            {selectedActividad.cant_horas && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Duración</h3>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="font-medium text-blue-800">{selectedActividad.cant_horas} horas</p>
                </div>
              </div>
            )}

            {/* Tiempo dedicado */}
            {selectedActividad.tiempo_dedicado && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tiempo Dedicado</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800">{selectedActividad.tiempo_dedicado} minutos</p>
                </div>
              </div>
            )}

            {/* Link */}
            {selectedActividad.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enlace</h3>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  onClick={() => window.open(selectedActividad.link!, '_blank')}
                >
                  Abrir enlace
                </button>
              </div>
            )}

            {/* Captures */}
            {selectedActividad.captures && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Notas</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedActividad.captures}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Ventana>
    </>
  );
}