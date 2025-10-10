import React, { useState, useEffect } from 'react';
import { Play, Pause, Camera, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';
import { useScreenshots } from '@/hooks/useScreenshots';
import { Actividad } from '@/domain/entities/Actividad';

interface ActividadCardProps {
  actividad: Actividad;
  index: number;
  onShowDetails: (actividad: Actividad) => void;
}

interface ActividadesGridProps {
  onShowDetails: (actividad: Actividad) => void;
}

const ActividadCard: React.FC<ActividadCardProps> = ({ actividad, index, onShowDetails }) => {
  const { usuario } = useAuth();
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
  const [showScreenshotsModal, setShowScreenshotsModal] = useState(false);

  const {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearScreenshots,
    error: screenshotError
  } = useScreenshots();

  // Filtrar screenshots de esta actividad
  const activityScreenshots = screenshots.filter(s => 
    s.mision_actividad === actividad.id?.toString() || 
    s.id_bloque === actividad.id?.toString()
  );

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        const newTime = calculateTimeUntilStart();
        setTimeInSeconds(newTime);
        if (newTime === 0) {
          setIsRunning(false);
          // Detener captura cuando el timer llega a 0
          if (isCapturing) {
            stopCapturing();
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval!);
  }, [isRunning, actividad.hora_inicio, isCapturing, stopCapturing]);

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
    console.log('🎬 [PLAY/PAUSE] Botón presionado');
    console.log('📊 Estado actual:', {
      isRunning,
      isCapturing,
      actividadId: actividad.id,
      descripcion: actividad.descripcion
    });

    const newRunningState = !isRunning;
    setIsRunning(newRunningState);
    console.log('🔄 Nuevo estado de running:', newRunningState);

    if (newRunningState && !isCapturing) {
      console.log('▶️ Intentando INICIAR captura...');
      console.log('📝 Actividad ID:', actividad.id);
      console.log('🌐 navigator.mediaDevices disponible:', !!navigator.mediaDevices);
      console.log('🎥 getDisplayMedia disponible:', !!navigator.mediaDevices?.getDisplayMedia);
      
      try {
        console.log('⏳ Llamando a startCapturing...');
        
        if (!usuario?.id) {
          throw new Error('Usuario no está autenticado');
        }
        
        await startCapturing({
          userId: usuario.id,
          actividadId: actividad.id.toString(),
          misionActividad: actividad.descripcion || 'Actividad sin descripción',
          totalTrabajadoHoy: actividad.tiempo_dedicado?.toString(),
          tiempoTareaActual: '0'
        });
        console.log('✅ Captura iniciada exitosamente');
      } catch (error) {
        console.error('❌ Error al iniciar captura:', error);
        console.error('📋 Detalles del error:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    } else if (!newRunningState && isCapturing) {
      console.log('⏸️ Deteniendo captura');
      stopCapturing();
      console.log('✅ Captura detenida');
    } else {
      console.log('ℹ️ No se realizó ninguna acción de captura');
      if (!newRunningState) {
        console.log('  → Timer ya estaba pausado');
      }
      if (isCapturing) {
        console.log('  → Ya hay una captura en curso');
      }
    }
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

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <>
      <div
        className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-pointer hover:bg-slate-500 transition-colors"
        draggable
        onDragStart={handleDragStart}
        onClick={handleShowDetails}
        title={`${actividad.descripcion || 'Sin descripción'} - ${formatDate(actividad.fecha)}`}
      >
        {/* Franja superior */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

        {/* Indicador de estado y botón de screenshots */}
        <div className="flex justify-between w-full relative z-10 items-center">
          <div 
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              isCapturing ? 'bg-red-500 animate-pulse' : 'bg-green-400'
            }`}
          />
          {activityScreenshots.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowScreenshotsModal(true);
              }}
              className="text-white/70 hover:text-white transition-colors p-0.5 flex items-center gap-1"
              title={`${activityScreenshots.length} capturas`}
            >
              <Camera size={10} />
              <span className="text-xs">{activityScreenshots.length}</span>
            </button>
          )}
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

        {/* Mensaje de error */}
        {screenshotError && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-500 text-white text-xs p-2 rounded shadow-lg z-50">
            {screenshotError}
          </div>
        )}
      </div>

      {/* Modal de Screenshots */}
      {showScreenshotsModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowScreenshotsModal(false)}
        >
          <div 
            className="bg-slate-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="bg-slate-700 p-4 flex justify-between items-center border-b border-slate-600">
              <div>
                <h3 className="text-white text-lg font-semibold">
                  Capturas de pantalla
                </h3>
                <p className="text-white/60 text-sm">
                  {actividad.descripcion || 'Sin descripción'} - {activityScreenshots.length} capturas
                </p>
              </div>
              <div className="flex gap-2">
                {activityScreenshots.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('¿Eliminar todas las capturas de esta actividad?')) {
                        clearScreenshots();
                        setShowScreenshotsModal(false);
                      }
                    }}
                    className="text-white/70 hover:text-red-400 transition-colors p-2 hover:bg-slate-600 rounded-lg"
                    title="Eliminar todas las capturas"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  onClick={() => setShowScreenshotsModal(false)}
                  className="text-white/70 hover:text-white transition-colors p-2 hover:bg-slate-600 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Grid de screenshots */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              {activityScreenshots.length === 0 ? (
                <div className="text-center text-white/50 py-12">
                  No hay capturas de pantalla para esta actividad
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activityScreenshots.map((screenshot) => (
                    <div 
                      key={screenshot.id}
                      className="bg-slate-700 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <div className="aspect-video bg-slate-900 relative group">
                        <img 
                          src={screenshot.img_url || ''} 
                          alt={`Captura ${formatTimestamp(screenshot.created_at)}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <a
                            href={screenshot.img_url || ''}
                            download={`captura-${actividad.id}-${screenshot.created_at}.png`}
                            className="bg-white text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Descargar
                          </a>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-white/80 text-sm">
                          {formatTimestamp(screenshot.created_at)}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          {screenshot.created_at.toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function ActividadesGrid({ onShowDetails }: ActividadesGridProps) {
  const { usuario } = useAuth();
  const { actividades, loading, error } = useActividades(usuario?.id || null);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2;
  const totalPages = Math.ceil(actividades.length / itemsPerPage);

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