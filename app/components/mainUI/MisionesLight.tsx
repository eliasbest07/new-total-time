"use client";

import { useState } from 'react';
import { useMisiones } from '@/hooks/useMisiones';
import { useActividades } from '@/hooks/useActividades';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { Mision } from '@/domain/entities/Mision';
import { Actividad } from '@/domain/entities/Actividad';
import Ventana from '@/app/demo/components/Ventana';
import { ChevronDown, ChevronUp, Calendar, RefreshCw } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export default function MisionesLight() {
    const { usuario } = useAuth();
  const { usuarioId, loading: loadingUserId } = useUsuarioId();
  const { misiones, loading: loadingMisiones, refetch } = useMisiones(usuarioId, { enableRealtime: false });
  const [isRefetching, setIsRefetching] = useState(false);
  const { actividades, loading: loadingActividades } = useActividades(usuario?.id ?? null);

  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [showMisionModal, setShowMisionModal] = useState(false);
  const [isMisionesMinimized, setIsMisionesMinimized] = useState(false);

  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [isActividadesMinimized, setIsActividadesMinimized] = useState(false);

  const loading = loadingUserId || loadingMisiones || loadingActividades;

  console.log('🎯 [MisionesLight] usuarioId:', usuarioId);
  console.log('🎯 [MisionesLight] loading:', loading);
  console.log('🎯 [MisionesLight] misiones:', misiones);
  console.log('🎯 [MisionesLight] misiones.length:', misiones?.length);
  console.log('🎯 [MisionesLight] actividades:', actividades);
  console.log('🎯 [MisionesLight] actividades.length:', actividades?.length);

  const handleMisionClick = (mision: Mision) => {
    setSelectedMision(mision);
    setShowMisionModal(true);
  };

  const handleActividadClick = (actividad: Actividad) => {
    setSelectedActividad(actividad);
    setShowActividadModal(true);
  };

  if (loading) {
    console.log('🎯 [MisionesLight] Mostrando loading...');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">Cargando tickets...</div>
      </div>
    );
  }

  if (!usuarioId) {
    console.log('🎯 [MisionesLight] No hay usuarioId, no renderizando');
    return null;
  }

  if (misiones.length === 0) {
    console.log('🎯 [MisionesLight] No hay misiones, mostrando mensaje');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">No hay tickets</div>
      </div>
    );
  }

  console.log('🎯 [MisionesLight] Renderizando', misiones.length, 'misiones');

  const handleRefetch = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  const handleDragStartMision = (e: React.DragEvent, mision: Mision) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'mision',
      id: mision.id,
      title: mision.nombre,
      description: mision.descripcion,
      hours: mision.horas,
      fecha_start: mision.fecha_start,
      fecha_end: mision.fecha_end,
      id_usuario: mision.id_usuario,
      id_creador: mision.id_creador
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartActividad = (e: React.DragEvent, actividad: Actividad) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'actividad',
      id: actividad.id,
      title: actividad.descripcion,
      descripcion: actividad.descripcion,
      fecha: actividad.fecha,
      hora_inicio: actividad.hora_inicio,
      cant_horas: actividad.cant_horas,
      id_usuario: actividad.id_usuario,
      id_proyecto: actividad.id_proyecto
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-3 space-y-3" style={{ maxWidth: '280px' }}>
        {/* SECCIÓN DE MISIONES */}
        <div>
          {/* Header de Tickets con título y botones */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">🎟️ Tickets</h3>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefetch}
                disabled={isRefetching}
                className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                title="Recargar tickets"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setIsMisionesMinimized(!isMisionesMinimized)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isMisionesMinimized ? 'Maximizar tickets' : 'Minimizar tickets'}
              >
                {!isMisionesMinimized ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Contenedor de Misiones con altura dinámica y scroll */}
          {!isMisionesMinimized && (
          <div
            className="overflow-y-auto space-y-1.5"
            style={{
              maxHeight: '230px',
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
            {misiones.map((mision) => (
              <div
                key={mision.id}
                draggable
                onDragStart={(e) => handleDragStartMision(e, mision)}
                onClick={() => handleMisionClick(mision)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-move"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {mision.nombre || 'Sin título'}
                  </p>
                  {mision.horas && mision.horas > 0 && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full w-fit">
                      {mision.horas}h
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* SECCIÓN DE ACTIVIDADES */}
        <div className="border-t border-gray-200 pt-3">
          {/* Header de Actividades con título y botón de minimizar/maximizar */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Actividades
            </h3>
            <button
              onClick={() => setIsActividadesMinimized(!isActividadesMinimized)}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={isActividadesMinimized ? 'Maximizar actividades' : 'Minimizar actividades'}
            >
              {!isActividadesMinimized ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>

          {/* Contenedor de Actividades con altura dinámica y scroll */}
          {!isActividadesMinimized && (
            <div
              className="overflow-y-auto space-y-1.5"
              style={{
                maxHeight: '300px',
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
              {actividades.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-2">
                  No hay actividades
                </div>
              ) : (
                actividades.map((actividad) => (
                  <div
                    key={actividad.id}
                    draggable
                    onDragStart={(e) => handleDragStartActividad(e, actividad)}
                    onClick={() => handleActividadClick(actividad)}
                    className="w-full text-left p-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors cursor-move"
                  >
                    <div className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {actividad.descripcion || 'Sin descripción'}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {actividad.fecha && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full w-fit">
                            {new Date(actividad.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {actividad.cant_horas && actividad.cant_horas > 0 && (
                          <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full w-fit">
                            {actividad.cant_horas}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalles de misión */}
      <Ventana
        isOpen={showMisionModal}
        onClose={() => {
          setShowMisionModal(false);
          setSelectedMision(null);
        }}
        title={selectedMision?.nombre || 'Misión'}
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        {selectedMision && (
          <div className="text-black space-y-6 p-4">
            {/* Nombre */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Nombre</h3>
              <p className="text-gray-700 text-xl font-medium">
                {selectedMision.nombre || 'Sin nombre'}
              </p>
            </div>

            {/* Descripción */}
            {selectedMision.descripcion && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Descripción</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedMision.descripcion}
                  </p>
                </div>
              </div>
            )}

            {/* Fechas */}
            {(selectedMision.fecha_start || selectedMision.fecha_end) && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Fechas</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                  {selectedMision.fecha_start && (
                    <p className="text-gray-700">
                      <span className="font-medium">Inicio:</span>{' '}
                      {new Date(selectedMision.fecha_start).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                  {selectedMision.fecha_end && (
                    <p className="text-gray-700">
                      <span className="font-medium">Fin:</span>{' '}
                      {new Date(selectedMision.fecha_end).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Horas */}
            {selectedMision.horas && selectedMision.horas > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Duración Estimada</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900 text-xl">
                    {selectedMision.horas} horas
                  </p>
                </div>
              </div>
            )}

            {/* Estado */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Estado</h3>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-700">En progreso</p>
              </div>
            </div>

            {/* ID de referencia */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Información técnica</h3>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">ID: {selectedMision.id}</p>
                {selectedMision.id_usuario && (
                  <p className="text-gray-600 text-sm">Usuario: {selectedMision.id_usuario}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Ventana>

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
        {selectedActividad && (
          <div className="text-black space-y-6 p-4">
            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Descripción</h3>
              <p className="text-gray-700 text-xl font-medium">
                {selectedActividad.descripcion || 'Sin descripción'}
              </p>
            </div>

            {/* Fecha */}
            {selectedActividad.fecha && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Fecha</h3>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-gray-700">
                    {new Date(selectedActividad.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}

            {/* Horario */}
            {selectedActividad.hora_inicio && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Horario</h3>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="text-gray-700">
                    <span className="font-medium">Inicio:</span> {selectedActividad.hora_inicio}
                  </p>
                </div>
              </div>
            )}

            {/* Duración */}
            {selectedActividad.cant_horas && selectedActividad.cant_horas > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Duración</h3>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="font-medium text-gray-900 text-xl">
                    {selectedActividad.cant_horas} horas
                  </p>
                </div>
              </div>
            )}

            {/* Tiempo dedicado */}
            {selectedActividad.tiempo_dedicado !== undefined && selectedActividad.tiempo_dedicado !== null && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Tiempo Dedicado</h3>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <p className="font-medium text-gray-900">
                    {selectedActividad.tiempo_dedicado} minutos
                  </p>
                </div>
              </div>
            )}

            {/* Link */}
            {selectedActividad.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Enlace</h3>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <a
                    href={selectedActividad.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:text-purple-800 underline break-all"
                  >
                    {selectedActividad.link}
                  </a>
                </div>
              </div>
            )}

            {/* ID de referencia */}
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Información técnica</h3>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">ID: {selectedActividad.id}</p>
                {selectedActividad.id_usuario && (
                  <p className="text-gray-600 text-sm">Usuario: {selectedActividad.id_usuario}</p>
                )}
                {selectedActividad.id_proyecto && (
                  <p className="text-gray-600 text-sm">Proyecto: {selectedActividad.id_proyecto}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Ventana>
    </>
  );
}
