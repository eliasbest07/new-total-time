"use client";

import { useState, useEffect } from 'react';
import { useMisionesOrganizacion } from '@/hooks/useMisionesOrganizacion';
import { useUsuariosOrganizacionContext } from '@/app/contexts/UsuariosOrganizacionContext';
import { MisionWithTodos } from '@/domain/entities/Mision';
import Ventana from '@/app/demo/components/Ventana';
import { PizarraRef } from '@/application/pizarra/types';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { MisionActiva } from '@/domain/entities/MisionActiva';
import { ChevronLeft, ChevronRight, Camera } from 'lucide-react';

interface MisionesOrganizacionProps {
  pizarraRef?: React.RefObject<PizarraRef | null>;
}

export default function MisionesOrganizacion({ pizarraRef }: MisionesOrganizacionProps) {
  const { usuarios, loading: loadingUsuarios } = useUsuariosOrganizacionContext();
  const { misiones, loading: loadingMisiones, error } = useMisionesOrganizacion(usuarios);
  const [selectedMision, setSelectedMision] = useState<MisionWithTodos | null>(null);
  const [showMisionModal, setShowMisionModal] = useState(false);
  const [misionActiva, setMisionActiva] = useState<MisionActiva | null>(null);
  const [capturasUrls, setCapturasUrls] = useState<string[]>([]);
  const [loadingCapturas, setLoadingCapturas] = useState(false);
  const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [misionesActivas, setMisionesActivas] = useState<Record<number, { estado: string; isRunning: boolean }>>({});

  const loading = loadingUsuarios || loadingMisiones;

  console.log('🎯 [MisionesOrganizacion] usuarios:', usuarios.length);
  console.log('🎯 [MisionesOrganizacion] loading:', loading);
  console.log('🎯 [MisionesOrganizacion] error:', error);
  console.log('🎯 [MisionesOrganizacion] misiones:', misiones);
  console.log('🎯 [MisionesOrganizacion] misiones.length:', misiones?.length);

  // Cargar y escuchar estado de todas las misiones activas
  useEffect(() => {
    const loadMisionesActivas = async () => {
      if (misiones.length === 0) return;

      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Cargar estado inicial de todas las misiones
      const { data: misionesActivasData, error: loadError } = await supabase
        .from('misiones_activas')
        .select('id_referencia, estado, is_running')
        .eq('tipo', 'mision')
        .in('id_referencia', misiones.map(m => m.id));

      if (loadError) {
        console.error('❌ Error cargando misiones activas:', loadError);
        return;
      }

      // Construir objeto con el estado de cada misión
      const estadoMisiones: Record<number, { estado: string; isRunning: boolean }> = {};
      misionesActivasData?.forEach(ma => {
        estadoMisiones[ma.id_referencia] = {
          estado: ma.estado || 'pendiente',
          isRunning: ma.is_running || false
        };
      });

      setMisionesActivas(estadoMisiones);
      console.log('✅ [MisionesOrganizacion] Estados iniciales cargados:', estadoMisiones);

      // Suscribirse a cambios en tiempo real
      const channel = supabase
        .channel('misiones-organizacion-activas')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'misiones_activas',
            filter: 'tipo=eq.mision'
          },
          (payload) => {
            console.log('📡 [MisionesOrganizacion] Cambio en misiones_activas:', payload);

            const updatedMision = payload.new as any;
            if (!updatedMision) return;

            const idReferencia = updatedMision.id_referencia;

            // Verificar si es una de nuestras misiones
            if (misiones.some(m => m.id === idReferencia)) {
              setMisionesActivas(prev => ({
                ...prev,
                [idReferencia]: {
                  estado: updatedMision.estado || 'pendiente',
                  isRunning: updatedMision.is_running || false
                }
              }));
              console.log('🔄 [MisionesOrganizacion] Estado actualizado para misión:', idReferencia);
            }
          }
        )
        .subscribe();

      return () => {
        console.log('🔕 [MisionesOrganizacion] Desuscribiendo de misiones_activas');
        supabase.removeChannel(channel);
      };
    };

    loadMisionesActivas();
  }, [misiones]);

  // Cargar misión activa cuando se selecciona una misión
  useEffect(() => {
    const loadMisionActiva = async () => {
      if (!selectedMision || !showMisionModal) {
        setMisionActiva(null);
        setCapturasUrls([]);
        setCurrentCaptureIndex(0);
        return;
      }

      try {
        setLoadingCapturas(true);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        const { data, error } = await supabase
          .from('misiones_activas')
          .select('*')
          .eq('tipo', 'mision')
          .eq('id_referencia', selectedMision.id)
          .maybeSingle();

        if (error) {
          console.error('Error cargando misión activa:', error);
          setCapturasUrls([]);
        } else {
          setMisionActiva(data);
          // TODO: Cargar capturas desde la tabla 'capture' si es necesario
          setCapturasUrls([]);
          console.log('📸 Misión activa cargada:', data);
        }
      } catch (error) {
        console.error('Error cargando misión activa:', error);
      } finally {
        setLoadingCapturas(false);
      }
    };

    loadMisionActiva();
  }, [selectedMision, showMisionModal]);

  // Función para obtener información del usuario asignado
  const getUsuarioInfo = (idUsuario: number | null) => {
    if (!idUsuario) return null;
    return usuarios.find(u => parseInt(u.id) === idUsuario);
  };

  const handleMisionClick = (mision: MisionWithTodos) => {
    // Intentar encontrar y centrar el card en la pizarra
    if (pizarraRef?.current?.findCardByMisionId && pizarraRef?.current?.centerOnCard) {
      const cardId = pizarraRef.current.findCardByMisionId(mision.id);
      if (cardId) {
        console.log('🎯 Card encontrado en pizarra, centrando vista:', cardId);
        pizarraRef.current.centerOnCard(cardId);
        return; // No abrir el modal si el card está en la pizarra
      }
    }

    // Si no está en la pizarra, abrir el modal
    setSelectedMision(mision);
    setShowMisionModal(true);
  };

  const handleDragStart = (e: React.DragEvent, mision: MisionWithTodos) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'mision-organizacion',
      id_mision: mision.id,
      title: mision.nombre,
      description: mision.descripcion,
      hours: mision.horas,
      fecha_start: mision.fecha_start,
      fecha_end: mision.fecha_end,
      id_usuario: mision.id_usuario,
      id_creador: mision.id_creador,
      card_todos: mision.card_todos // 📋 Incluir las referencias a los TODOs
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (loading) {
    console.log('🎯 [MisionesOrganizacion] Mostrando loading...');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">Cargando misiones...</div>
      </div>
    );
  }

  if (error) {
    console.log('🎯 [MisionesOrganizacion] Error:', error);
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (misiones.length === 0) {
    console.log('🎯 [MisionesOrganizacion] No hay misiones, mostrando mensaje');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">No hay misiones</div>
      </div>
    );
  }

  console.log('🎯 [MisionesOrganizacion] Renderizando', misiones.length, 'misiones');

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-3" style={{ maxWidth: '250px' }}>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">🎯 Tickets de la Organización</h3>
        {/* Contenedor con altura fija y scroll */}
        <div
          className="overflow-y-auto space-y-1.5"
          style={{
            maxHeight: '400px',
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
          {misiones.map((mision) => {
            const usuarioAsignado = getUsuarioInfo(mision.id_usuario);
            const estadoMision = misionesActivas[mision.id];
            const isEnProgreso = estadoMision?.estado === 'en_progreso' || estadoMision?.isRunning;

            return (
              <div
                key={mision.id}
                draggable
                onDragStart={(e) => handleDragStart(e, mision)}
                onClick={() => handleMisionClick(mision)}
                className={`w-full text-left p-2 border rounded-lg transition-colors cursor-move ${
                  isEnProgreso
                    ? 'bg-green-50 hover:bg-green-100 border-green-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    {isEnProgreso && (
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="En progreso"></span>
                    )}
                    <p className="text-xs font-medium text-gray-900 truncate flex-1">
                      {mision.nombre || 'Sin título'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {mision.horas && mision.horas > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full w-fit ${
                        isEnProgreso
                          ? 'bg-green-200 text-green-700'
                          : 'bg-blue-200 text-blue-700'
                      }`}>
                        {mision.horas}h
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
                          <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
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
        {selectedMision && (() => {
          const usuarioAsignado = getUsuarioInfo(selectedMision.id_usuario);
          return (
            <div className="text-black space-y-6 p-4">
              {/* Nombre */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Nombre</h3>
                <p className="text-gray-700 text-xl font-medium">
                  {selectedMision.nombre || 'Sin nombre'}
                </p>
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
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
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

              {/* Tareas (Card Todos) */}
              {selectedMision.cardTodosData && selectedMision.cardTodosData.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">Tareas</h3>
                  <div className="space-y-3">
                    {selectedMision.cardTodosData.map((cardData, cardIndex) => (
                      <div key={cardData.card.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        {/* Título del card si existe */}
                        {cardData.card.title && (
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                            <span className="text-blue-600">📋</span>
                            {cardData.card.title}
                          </h4>
                        )}

                        {/* Lista de todos */}
                        {cardData.todos.length > 0 ? (
                          <ul className="space-y-1.5">
                            {cardData.todos.map((todo) => (
                              <li key={todo.id} className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={todo.completed}
                                  readOnly
                                  className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 cursor-default"
                                />
                                <span className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                  {todo.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No hay tareas en este card</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Capturas de pantalla */}
              {misionActiva && (
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Capturas de Pantalla
                  </h3>
                  {loadingCapturas ? (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-gray-500 text-sm">Cargando capturas...</p>
                    </div>
                  ) : capturasUrls && capturasUrls.length > 0 ? (
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
                          Captura {currentCaptureIndex + 1} de {capturasUrls.length}
                        </span>

                        <button
                          onClick={() => setCurrentCaptureIndex(Math.min(capturasUrls.length - 1, currentCaptureIndex + 1))}
                          disabled={currentCaptureIndex === capturasUrls.length - 1}
                          className={`p-2 rounded-lg transition-colors ${
                            currentCaptureIndex === capturasUrls.length - 1
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Imagen de captura */}
                      <div
                        className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedImage(capturasUrls[currentCaptureIndex])}
                      >
                        <img
                          src={capturasUrls[currentCaptureIndex]}
                          alt={`Captura ${currentCaptureIndex + 1}`}
                          className="w-full h-auto object-contain"
                          style={{ maxHeight: '400px' }}
                        />
                      </div>

                      {/* Info adicional */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-blue-900 font-medium">Total de capturas:</span>
                          <span className="text-blue-700 font-semibold">{capturasUrls.length}</span>
                        </div>
                        {misionActiva.fecha_ultimo_capture && (
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-blue-900 font-medium">Última captura:</span>
                            <span className="text-blue-700">
                              {new Date(misionActiva.fecha_ultimo_capture).toLocaleString('es-ES', {
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
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-gray-500 text-sm text-center">
                        No hay capturas disponibles para esta misión
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ID de referencia */}
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Información técnica</h3>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">ID: {selectedMision.id}</p>
                  {selectedMision.id_usuario && (
                    <p className="text-gray-600 text-sm">ID Usuario: {selectedMision.id_usuario}</p>
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
