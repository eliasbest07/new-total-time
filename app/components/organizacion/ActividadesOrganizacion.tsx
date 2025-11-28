"use client";

import { useState, useEffect } from 'react';
import { useActividadesOrganizacion } from '@/hooks/useActividadesOrganizacion';
import { useUsuariosOrganizacionContext } from '@/app/contexts/UsuariosOrganizacionContext';
import { Actividad } from '@/domain/entities/Actividad';
import Ventana from '@/app/demo/components/Ventana';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';

const captureRepository = new CaptureRepositorySupabase();

export default function ActividadesOrganizacion() {
  const { usuarios, loading: loadingUsuarios } = useUsuariosOrganizacionContext();
  const { actividades, loading: loadingActividades, error } = useActividadesOrganizacion(usuarios);
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [actividadCaptures, setActividadCaptures] = useState<Capture[]>([]);
  const [loadingCapturas, setLoadingCapturas] = useState(false);
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actividadesTiempos, setActividadesTiempos] = useState<Map<number, number>>(new Map());

  const loading = loadingUsuarios || loadingActividades;

  // Función para calcular tiempo restante hasta el inicio de la actividad
  const calculateTimeUntilStart = (horaInicio: string | null) => {
    if (!horaInicio) return 0;

    try {
      const targetDateTime = new Date(horaInicio);

      if (isNaN(targetDateTime.getTime())) {
        return 0;
      }

      const now = new Date();
      const diffInMs = targetDateTime.getTime() - now.getTime();
      const diffInSeconds = Math.floor(diffInMs / 1000);

      return diffInSeconds > 0 ? diffInSeconds : 0;
    } catch (error) {
      console.error('Error parsing hora_inicio:', horaInicio, error);
      return 0;
    }
  };

  // Función para formatear tiempo en HH:MM o MM
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

  console.log('📅 [ActividadesOrganizacion] usuarios:', usuarios.length);
  console.log('📅 [ActividadesOrganizacion] loading:', loading);
  console.log('📅 [ActividadesOrganizacion] error:', error);
  console.log('📅 [ActividadesOrganizacion] actividades:', actividades);
  console.log('📅 [ActividadesOrganizacion] actividades.length:', actividades?.length);

  // Actualizar tiempos cada segundo
  useEffect(() => {
    if (!actividades || actividades.length === 0) return;

    // Inicializar tiempos
    const nuevosTimpos = new Map<number, number>();
    actividades.forEach(act => {
      if (act.hora_inicio) {
        nuevosTimpos.set(act.id, calculateTimeUntilStart(act.hora_inicio));
      }
    });
    setActividadesTiempos(nuevosTimpos);

    // Actualizar cada segundo
    const interval = setInterval(() => {
      const tiemposActualizados = new Map<number, number>();
      actividades.forEach(act => {
        if (act.hora_inicio) {
          tiemposActualizados.set(act.id, calculateTimeUntilStart(act.hora_inicio));
        }
      });
      setActividadesTiempos(tiemposActualizados);
    }, 1000);

    return () => clearInterval(interval);
  }, [actividades]);

  // Cargar capturas cuando se selecciona una actividad
  useEffect(() => {
    const loadCapturas = async () => {
      if (!selectedActividad || !showActividadModal) {
        setActividadCaptures([]);
        setCurrentCaptureIndex(0);
        return;
      }

      setLoadingCapturas(true);
      try {
        console.log('📸 [ActividadesOrganizacion] ====== INICIO DEBUG CAPTURAS ======');
        console.log('📸 [ActividadesOrganizacion] SelectedActividad:', selectedActividad);
        console.log('📸 [ActividadesOrganizacion] selectedActividad.id:', selectedActividad.id);
        console.log('📸 [ActividadesOrganizacion] selectedActividad.id_usuario:', selectedActividad.id_usuario);

        const actividadId = selectedActividad.id;
        if (!actividadId) {
          console.log(`📸 [ActividadesOrganizacion] No hay id de actividad disponible`);
          setActividadCaptures([]);
          return;
        }

        console.log(`📸 [ActividadesOrganizacion] Buscando capturas de la actividad: ${actividadId}`);

        // Buscar todas las capturas de esta actividad
        const captures = await captureRepository.getByBloque(String(actividadId));
        console.log(`📸 [ActividadesOrganizacion] Capturas encontradas: ${captures.length}`);

        if (captures.length > 0) {
          console.log('📸 [ActividadesOrganizacion] IDs de usuario en las capturas encontradas:',
            captures.map(c => c.id_usuario).filter((v, i, a) => a.indexOf(v) === i));
        }

        console.log(`📸 [ActividadesOrganizacion] ====== RESULTADO FINAL: ${captures.length} capturas ======`);

        setActividadCaptures(captures);
        setCurrentCaptureIndex(0);
      } catch (error) {
        console.error('📸 [ActividadesOrganizacion] Error cargando capturas de actividad:', error);
        setActividadCaptures([]);
      } finally {
        setLoadingCapturas(false);
      }
    };

    loadCapturas();
  }, [selectedActividad, showActividadModal]);

  // Función para obtener información del usuario asignado
  const getUsuarioInfo = (idUsuario: string | null) => {
    if (!idUsuario) return null;
    return usuarios.find(u => u.userAuth === idUsuario);
  };

  const handleActividadClick = (actividad: Actividad) => {
    setSelectedActividad(actividad);
    setShowActividadModal(true);
  };

  const handleDragStart = (e: React.DragEvent, actividad: Actividad) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'actividad-organizacion',
      id_actividad: actividad.id,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha,
      hora_inicio: actividad.hora_inicio,
      cant_horas: actividad.cant_horas,
      link: actividad.link,
      id_usuario: actividad.id_usuario,
      id_proyecto: actividad.id_proyecto,
      tiempo_dedicado: actividad.tiempo_dedicado
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (loading) {
    console.log('📅 [ActividadesOrganizacion] Mostrando loading...');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">Cargando actividades...</div>
      </div>
    );
  }

  if (error) {
    console.log('📅 [ActividadesOrganizacion] Error:', error);
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (actividades.length === 0) {
    console.log('📅 [ActividadesOrganizacion] No hay actividades, mostrando mensaje');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">No hay actividades</div>
      </div>
    );
  }

  console.log('📅 [ActividadesOrganizacion] Renderizando', actividades.length, 'actividades');

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-3" style={{ maxWidth: '250px' }}>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">📅 Actividades de la Organización</h3>
        {/* Contenedor con altura fija y scroll */}
        <div
          className="overflow-y-auto space-y-1.5"
          style={{
            maxHeight: '150px',
            scrollbarWidth: 'thin',
            scrollbarColor: '#9CA3AF #E5E7EB'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              width: 6px;
            }
            div::-webkit-scrollbar-track {
              background: #E5E7EB;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb {
              background: #9CA3AF;
              border-radius: 3px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #6B7280;
            }
          `}</style>
          {actividades.map((actividad) => {
            const usuarioAsignado = getUsuarioInfo(actividad.id_usuario);
            const tiempoRestante = actividadesTiempos.get(actividad.id) || 0;

            return (
              <div
                key={actividad.id}
                draggable
                onDragStart={(e) => handleDragStart(e, actividad)}
                onClick={() => handleActividadClick(actividad)}
                className="w-full text-left p-2 border rounded-lg transition-colors cursor-move bg-gray-50 hover:bg-gray-100 border-gray-200"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {actividad.descripcion || 'Sin descripción'}
                  </p>
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      {actividad.cant_horas && actividad.cant_horas > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full w-fit bg-orange-200 text-orange-700">
                          {actividad.cant_horas}h
                        </span>
                      )}
                      {actividad.hora_inicio && tiempoRestante > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full w-fit bg-blue-200 text-blue-700 font-mono">
                          ⏱️ {formatTime(tiempoRestante)}
                        </span>
                      )}
                    </div>
                    {actividad.fecha && (
                      <span className="text-[10px] text-gray-500">
                        {new Date(actividad.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                    )}
                    {usuarioAsignado && (
                      <div className="flex items-center gap-1" title={usuarioAsignado.getNombreCompleto()}>
                        {usuarioAsignado.profile.avatar ? (
                          <img
                            src={usuarioAsignado.profile.avatar}
                            alt={usuarioAsignado.getNombreCompleto()}
                            className="w-5 h-5 rounded-full object-cover border border-gray-300"
                          />
                        ) : (
                          <div className="w-5 h-5 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-[8px] text-white font-semibold">
                              {usuarioAsignado.profile.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de detalles de actividad */}
      <Ventana
        isOpen={showActividadModal}
        onClose={() => {
          setShowActividadModal(false);
          setSelectedActividad(null);
        }}
        title={selectedActividad?.descripcion || 'Actividad'}
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        {selectedActividad && (() => {
          const usuarioAsignado = getUsuarioInfo(selectedActividad.id_usuario);
          return (
            <div className="text-black space-y-6 p-4">
              {/* Descripción */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Descripción</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedActividad.descripcion || 'Sin descripción'}
                  </p>
                </div>
              </div>

              {/* Usuario Asignado */}
              {usuarioAsignado && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Usuario Asignado</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      {usuarioAsignado.profile.avatar ? (
                        <img
                          src={usuarioAsignado.profile.avatar}
                          alt={usuarioAsignado.getNombreCompleto()}
                          className="w-12 h-12 rounded-full object-cover border border-gray-300"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                          <span className="text-lg text-white font-semibold">
                            {usuarioAsignado.profile.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {usuarioAsignado.getNombreCompleto()}
                        </p>
                        <p className="text-sm text-gray-600">
                          @{usuarioAsignado.profile.username}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fecha y Hora */}
              {(selectedActividad.fecha || selectedActividad.hora_inicio) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Fecha y Hora</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                    {selectedActividad.fecha && (
                      <p className="text-gray-700">
                        <span className="font-medium">Fecha:</span>{' '}
                        {new Date(selectedActividad.fecha).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                    {selectedActividad.hora_inicio && (
                      <p className="text-gray-700">
                        <span className="font-medium">Hora de Inicio:</span>{' '}
                        {new Date(selectedActividad.hora_inicio).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Horas Estimadas */}
              {selectedActividad.cant_horas && selectedActividad.cant_horas > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Duración Estimada</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-900 text-xl">
                      {selectedActividad.cant_horas} horas
                    </p>
                  </div>
                </div>
              )}

              {/* Tiempo Dedicado */}
              {selectedActividad.tiempo_dedicado && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Tiempo Dedicado</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="font-medium text-gray-900 text-xl">
                      {selectedActividad.tiempo_dedicado} minutos
                    </p>
                  </div>
                </div>
              )}

              {/* Link */}
              {selectedActividad.link && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Enlace</h3>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <a
                      href={selectedActividad.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline break-all"
                    >
                      {selectedActividad.link}
                    </a>
                  </div>
                </div>
              )}

              {/* Capturas de pantalla */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Capturas de Pantalla ({actividadCaptures.length}) - Tiempo: {actividadCaptures.length * 5} min
                </h3>
                {loadingCapturas ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                  </div>
                ) : actividadCaptures.length === 0 ? (
                  <div className="bg-gray-100 p-3 rounded-lg text-center">
                    <p className="text-gray-500 text-sm">No hay capturas para esta actividad</p>
                    <p className="text-gray-400 text-xs mt-1">ID buscado (id_bloque): "{selectedActividad.id}"</p>
                    <p className="text-gray-400 text-xs">Las capturas aparecerán cuando se soliciten durante la actividad</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Navegación de capturas */}
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <button
                        onClick={() => setCurrentCaptureIndex(Math.max(0, currentCaptureIndex - 1))}
                        disabled={currentCaptureIndex === 0}
                        className={`p-2 rounded-lg transition-colors ${
                          currentCaptureIndex === 0
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <span className="text-sm text-gray-600 font-medium">
                        Captura {currentCaptureIndex + 1} de {actividadCaptures.length}
                      </span>

                      <button
                        onClick={() => setCurrentCaptureIndex(Math.min(actividadCaptures.length - 1, currentCaptureIndex + 1))}
                        disabled={currentCaptureIndex === actividadCaptures.length - 1}
                        className={`p-2 rounded-lg transition-colors ${
                          currentCaptureIndex === actividadCaptures.length - 1
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Grid de capturas */}
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {actividadCaptures.map((capture, index) => (
                        <div
                          key={capture.id}
                          className={`relative group cursor-pointer ${
                            index === currentCaptureIndex ? 'ring-2 ring-orange-500' : ''
                          }`}
                          onClick={() => setCurrentCaptureIndex(index)}
                        >
                          <img
                            src={capture.img_url || '/placeholder-image.png'}
                            alt={`Captura ${index + 1}`}
                            className="w-full h-20 object-cover rounded hover:opacity-80 transition-opacity"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded-b">
                            <p className="truncate">
                              {new Date(capture.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })} | A:{capture.id_bloque}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Imagen ampliada de la captura seleccionada */}
                    <div
                      className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => actividadCaptures[currentCaptureIndex]?.img_url && setSelectedImage(actividadCaptures[currentCaptureIndex].img_url)}
                    >
                      <img
                        src={actividadCaptures[currentCaptureIndex]?.img_url || '/placeholder-image.png'}
                        alt={`Captura ${currentCaptureIndex + 1}`}
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '400px' }}
                      />
                    </div>

                    {/* Info adicional */}
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-orange-900 font-medium">Total de capturas:</span>
                        <span className="text-orange-700 font-semibold">{actividadCaptures.length}</span>
                      </div>
                      {actividadCaptures[currentCaptureIndex] && (
                        <div className="flex items-center justify-between text-sm mt-1">
                          <span className="text-orange-900 font-medium">Fecha captura actual:</span>
                          <span className="text-orange-700">
                            {new Date(actividadCaptures[currentCaptureIndex].created_at).toLocaleString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ID de referencia */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Información técnica</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">ID: {selectedActividad.id}</p>
                  {selectedActividad.id_usuario && (
                    <p className="text-gray-600 text-sm">ID Usuario: {selectedActividad.id_usuario}</p>
                  )}
                  {selectedActividad.id_proyecto && (
                    <p className="text-gray-600 text-sm">ID Proyecto: {selectedActividad.id_proyecto}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Ventana>

      {/* Modal para ver imagen en grande */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-[95vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg transition-colors z-10 font-medium"
            >
              ✕ Cerrar
            </button>
            <img
              src={selectedImage}
              alt="Captura ampliada"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
