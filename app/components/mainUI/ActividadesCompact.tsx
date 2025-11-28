import React, { useState, useEffect } from 'react';
import { Play, Pause, Camera, X, Trash2 } from 'lucide-react';
import { useActividades } from '@/hooks/useActividades';
import { useAuth } from '@/app/contexts/AuthContext';
import { useScreenshots } from '@/hooks/useScreenshots';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useSesionesTracking } from '@/hooks/useSesionesTracking';
import { Actividad } from '@/domain/entities/Actividad';

interface ActividadCompactCardProps {
  actividad: Actividad;
  index: number;
}

const ActividadCompactCard: React.FC<ActividadCompactCardProps> = ({ actividad, index }) => {
  const [timeInSeconds, setTimeInSeconds] = useState((22 + index) * 60 + 59);
  const [isRunning, setIsRunning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [misionActivaId, setMisionActivaId] = useState<string | null>(null);

  const { usuario } = useAuth();

  const {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearScreenshots,
    clearScreenshotsByBloque,
    error: screenshotError
  } = useScreenshots();

  const { getOrCreateMisionActiva, updateRunningState, addCaptureUrl } = useMisionActiva();
  const { iniciarSesion, finalizarSesion } = useSesionesTracking();

  // Filtrar screenshots de esta actividad
  const activityScreenshots = screenshots.filter(s => s.id_bloque === actividad.id.toString());

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning && timeInSeconds > 0) {
      interval = setInterval(() => {
        setTimeInSeconds(seconds => seconds - 1);
      }, 1000);
    } else if (timeInSeconds === 0) {
      setIsRunning(false);
      // Detener captura cuando el timer llega a 0
      if (isCapturing) {
        stopCapturing();
      }
    }
    return () => clearInterval(interval!);
  }, [isRunning, timeInSeconds, isCapturing, stopCapturing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    const newRunningState = !isRunning;
    setIsRunning(newRunningState);

    if (newRunningState && !isCapturing) {
      // Iniciar captura de pantalla
      console.log('Iniciando captura para actividad:', actividad.id);
      try {
        // 1. Obtener o crear misión activa
        if (!usuario?.id) {
          console.error('No hay usuario logueado');
          return;
        }

        const misionActiva = await getOrCreateMisionActiva({
          tipo: 'actividad',
          id_referencia: actividad.id,
          id_usuario_asignado: usuario.id
        });

        if (!misionActiva) {
          console.error('No se pudo crear/obtener misión activa');
          return;
        }

        setMisionActivaId(misionActiva.id);

        // 2. Iniciar captura con callback para actualizar fecha de última captura
        await startCapturing({
          userId: actividad.id_usuario?.toString() || usuario.id,
          userEmail: usuario.email || '',
          actividadId: actividad.id.toString(),
          misionActividad: actividad.descripcion || 'Actividad sin descripción',
          totalTrabajadoHoy: actividad.tiempo_dedicado?.toString(),
          tiempoTareaActual: formatTime(timeInSeconds),
          misionActivaId: misionActiva.id, // Pasar ID para actualizar fecha en capturas automáticas
          onCaptureUpdate: async (url: string) => {
            // Actualizar fecha de última captura en misiones_activas
            console.log('📸 Captura guardada en tabla capture, actualizando fecha:', url);
            await addCaptureUrl(misionActiva.id, url);
            console.log('✅ Fecha de captura actualizada en misiones_activas');
          }
        });

        // 3. Actualizar estado en Supabase
        await updateRunningState(misionActiva.id, {
          is_running: true,
          estado: 'en_progreso',
          fecha_inicio: new Date().toISOString()
        });

        // 4. Iniciar sesión de tracking local
        iniciarSesion(misionActiva.id, 'actividad');

        console.log('Captura iniciada exitosamente');
      } catch (error) {
        console.error('Error al iniciar captura:', error);
      }
    } else if (!newRunningState && isCapturing) {
      // Detener captura de pantalla
      console.log('Deteniendo captura');

      // Actualizar estado en Supabase si tenemos el ID
      if (misionActivaId) {
        await updateRunningState(misionActivaId, {
          is_running: false,
          estado: 'pausada',
          fecha_pausa: new Date().toISOString(),
          tiempo_total_segundos: ((22 + index) * 60 + 59) - timeInSeconds
        });

        // Finalizar sesión de tracking local
        finalizarSesion(misionActivaId);
      }

      stopCapturing();
    }
  };

  const resetTimer = () => {
    setTimeInSeconds((22 + index) * 60 + 59);
    setIsRunning(false);
    if (isCapturing) {
      stopCapturing();
    }
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
      id: actividad.id,
      id_usuario: actividad.id_usuario
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
    <>
      <div
        className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-grab active:cursor-grabbing hover:bg-slate-500 transition-colors"
        draggable
        onDragStart={handleDragStart}
        title={`${actividad.descripcion || 'Sin descripción'} - ${formatDate(actividad.fecha)}`}
      >
        {/* Franja superior */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

        {/* Indicador de estado y botón de screenshots */}
        <div className="flex justify-between w-full relative z-10 items-center">
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${isCapturing ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
              }`}
          />
          {activityScreenshots.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowModal(true);
              }}
              className="text-white/70 hover:text-white transition-colors p-0.5"
              title={`${activityScreenshots.length} capturas`}
            >
              <Camera size={10} />
            </button>
          )}
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

        {/* Mensaje de error */}
        {screenshotError && (
          <div className="absolute bottom-full mb-2 left-0 right-0 bg-red-500 text-white text-xs p-2 rounded shadow-lg">
            {screenshotError}
          </div>
        )}
      </div>

      {/* Modal de Screenshots */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
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
                <button
                  onClick={() => {
                    if (confirm('¿Eliminar todas las capturas de esta actividad?')) {
                      clearScreenshotsByBloque(actividad.id.toString());
                    }
                  }}
                  className="text-white/70 hover:text-red-400 transition-colors p-2 hover:bg-slate-600 rounded-lg"
                  title="Eliminar todas las capturas"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  onClick={() => setShowModal(false)}
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
                          src={screenshot.img_url || '/placeholder-image.png'}
                          alt={`Captura ${new Date(screenshot.created_at).toLocaleTimeString()}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          {screenshot.img_url ? (
                            <a
                              href={screenshot.img_url}
                              download={`captura-${new Date(screenshot.created_at).getTime()}.png`}
                              className="bg-white text-slate-900 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors"
                            >
                              Descargar
                            </a>
                          ) : (
                            <span className="bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium cursor-not-allowed">
                              No disponible
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-white/80 text-sm">
                          {new Date(screenshot.created_at).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </p>
                        <p className="text-white/50 text-xs mt-1">
                          {new Date(screenshot.created_at).toLocaleDateString('es-ES')}
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

export default function ActividadesCompact() {
  const { usuario } = useAuth();
  const { actividades, loading, error } = useActividades(usuario?.id || null);

  if (loading) {
    return (
      <div className="bg-slate-600 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-600 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="text-white/70 text-xs text-center">Error</div>
      </div>
    );
  }

  if (actividades.length === 0) {
    return (
      <div className="bg-slate-600/50 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="text-white/70 text-xs text-center">Sin actividades</div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {actividades.slice(0, 3).map((actividad, index) => (
        <ActividadCompactCard
          key={actividad.id}
          actividad={actividad}
          index={index}
        />
      ))}
    </div>
  );
}