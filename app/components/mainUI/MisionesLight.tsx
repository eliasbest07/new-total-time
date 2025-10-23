"use client";

import { useState } from 'react';
import { useMisiones } from '@/hooks/useMisiones';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { Mision } from '@/domain/entities/Mision';
import Ventana from '@/app/demo/components/Ventana';

export default function MisionesLight() {
  const { usuarioId, loading: loadingUserId } = useUsuarioId();
  const { misiones, loading: loadingMisiones } = useMisiones(usuarioId);
  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [showMisionModal, setShowMisionModal] = useState(false);

  const loading = loadingUserId || loadingMisiones;

  console.log('🎯 [MisionesLight] usuarioId:', usuarioId);
  console.log('🎯 [MisionesLight] loading:', loading);
  console.log('🎯 [MisionesLight] misiones:', misiones);
  console.log('🎯 [MisionesLight] misiones.length:', misiones?.length);

  const handleMisionClick = (mision: Mision) => {
    setSelectedMision(mision);
    setShowMisionModal(true);
  };

  if (loading) {
    console.log('🎯 [MisionesLight] Mostrando loading...');
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-4">
        <div className="text-sm text-gray-500">Cargando misiones...</div>
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
        <div className="text-sm text-gray-500">No hay misiones</div>
      </div>
    );
  }

  console.log('🎯 [MisionesLight] Renderizando', misiones.length, 'misiones');

  const handleDragStart = (e: React.DragEvent, mision: Mision) => {
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

  return (
    <>
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-md p-3" style={{ maxWidth: '200px' }}>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">📋 Misiones</h3>
        <div className="space-y-1.5">
          {misiones.slice(0, 3).map((mision) => (
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
                {mision.horas && mision.horas > 0 && (
                  <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full w-fit">
                    {mision.horas}h
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {misiones.length > 3 && (
          <div className="mt-1.5 text-center">
            <span className="text-xs text-gray-500">
              +{misiones.length - 3}
            </span>
          </div>
        )}
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
    </>
  );
}
