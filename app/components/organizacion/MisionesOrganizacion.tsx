"use client";

import { useState } from 'react';
import { useMisionesOrganizacion } from '@/hooks/useMisionesOrganizacion';
import { useUsuariosOrganizacionContext } from '@/app/contexts/UsuariosOrganizacionContext';
import { Mision } from '@/domain/entities/Mision';
import Ventana from '@/app/demo/components/Ventana';
import { PizarraRef } from '@/application/pizarra/types';

interface MisionesOrganizacionProps {
  pizarraRef?: React.RefObject<PizarraRef>;
}

export default function MisionesOrganizacion({ pizarraRef }: MisionesOrganizacionProps) {
  const { usuarios, loading: loadingUsuarios } = useUsuariosOrganizacionContext();
  const { misiones, loading: loadingMisiones, error } = useMisionesOrganizacion(usuarios);
  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [showMisionModal, setShowMisionModal] = useState(false);

  const loading = loadingUsuarios || loadingMisiones;

  console.log('🎯 [MisionesOrganizacion] usuarios:', usuarios.length);
  console.log('🎯 [MisionesOrganizacion] loading:', loading);
  console.log('🎯 [MisionesOrganizacion] error:', error);
  console.log('🎯 [MisionesOrganizacion] misiones:', misiones);
  console.log('🎯 [MisionesOrganizacion] misiones.length:', misiones?.length);

  // Función para obtener información del usuario asignado
  const getUsuarioInfo = (idUsuario: number | null) => {
    if (!idUsuario) return null;
    return usuarios.find(u => parseInt(u.id) === idUsuario);
  };

  const handleMisionClick = (mision: Mision) => {
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

  const handleDragStart = (e: React.DragEvent, mision: Mision) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'mision-organizacion',
      id_mision: mision.id,
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
        <h3 className="text-xs font-semibold text-gray-700 mb-2">🎯 Misiones de la Organización</h3>
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
            return (
              <div
                key={mision.id}
                draggable
                onDragStart={(e) => handleDragStart(e, mision)}
                onClick={() => handleMisionClick(mision)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors cursor-move"
              >
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {mision.nombre || 'Sin título'}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    {mision.horas && mision.horas > 0 && (
                      <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full w-fit">
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
    </>
  );
}
