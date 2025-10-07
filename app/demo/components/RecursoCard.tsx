import React, { useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { useRecursos } from '@/hooks/useRecursos';
import { useAuth } from '@/app/contexts/AuthContext';
import { Recurso } from '@/domain/entities/Recurso';
import Ventana from './Ventana';

export default function RecursoCard() {
  const { usuario } = useAuth();
  const { recursos, loading } = useRecursos(usuario?.id || null);
  const [showRecursoDetails, setShowRecursoDetails] = useState(false);

  // Obtener el recurso más reciente
  const recursoActual = recursos.length > 0 ? recursos[0] : null;

  const handleShowDetails = () => {
    if (recursoActual) {
      setShowRecursoDetails(true);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    const recursoData = {
      type: 'recurso',
      nombre: recursoActual?.nombre || 'Sin nombre',
      link: recursoActual?.link || '',
      icono: recursoActual?.icono || '',
      proyecto_id: recursoActual?.proyecto_id || null
    };

    e.dataTransfer.setData('application/json', JSON.stringify(recursoData));
    e.dataTransfer.setData('text/plain', `Recurso - ${recursoActual?.nombre || 'Sin nombre'}`);
  };

  if (loading) {
    return (
      <div className="bg-slate-600 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-pointer hover:bg-slate-500 transition-colors"
        draggable
        onDragStart={handleDragStart}
        onClick={handleShowDetails}
        title={recursoActual?.nombre || 'Sin recursos disponibles'}
      >
        {/* Franja superior */}
        <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

        {/* Indicador de estado */}
        <div className="flex justify-start w-full relative z-10">
          <div
            className={`w-3 h-3 rounded-full transition-colors duration-300 ${
              recursoActual ? 'bg-blue-400' : 'bg-gray-400'
            }`}
          />
        </div>

        {/* Información del recurso */}
        <div className="flex-1 flex items-center justify-center w-full">
          {recursoActual ? (
            <div className="text-center">
              <div className="text-white text-sm font-light tracking-wide">
                {recursoActual.icono || '📚'}
              </div>
              <div className="text-white/70 text-xs mt-1 truncate max-w-16">
                {recursoActual.nombre || 'Sin nombre'}
              </div>
            </div>
          ) : (
            <div className="text-white/70 text-xs text-center">
              Sin recursos
            </div>
          )}
        </div>

        {/* Icono de enlace decorativo */}
        <div className="flex justify-end w-full">
          <div className="text-white p-1">
            <ExternalLink size={12} />
          </div>
        </div>
      </div>

      {/* Ventana de detalles del recurso */}
      <Ventana
        isOpen={showRecursoDetails}
        onClose={() => setShowRecursoDetails(false)}
        title="Detalles del Recurso"
        initialWidth={600}
        initialHeight={400}
        minWidth={500}
        minHeight={300}
        showOverlay={true}
      >
        {recursoActual && (
          <div className="text-black space-y-6 p-4">
            {/* Nombre */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Nombre</h3>
              <p className="text-gray-700">{recursoActual.nombre || 'Sin nombre'}</p>
            </div>

            {/* Icono */}
            {recursoActual.icono && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Icono</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <span className="text-2xl">{recursoActual.icono}</span>
                </div>
              </div>
            )}

            {/* Enlace */}
            {recursoActual.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enlace</h3>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="text-blue-800 break-all mb-2">{recursoActual.link}</p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    onClick={() => window.open(recursoActual.link!, '_blank')}
                  >
                    Abrir enlace
                  </button>
                </div>
              </div>
            )}

            {/* Proyecto ID */}
            {recursoActual.proyecto_id && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Proyecto</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800">ID: {recursoActual.proyecto_id}</p>
                </div>
              </div>
            )}

            {/* Fecha de creación */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha de Creación</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700">
                  {new Date(recursoActual.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </Ventana>
    </>
  );
}