import React, { useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { useRecursos } from '@/hooks/useRecursos';
import { useAuth } from '@/app/contexts/AuthContext';
import { Recurso } from '@/domain/entities/Recurso';
import Ventana from './Ventana';

interface RecursoCardProps {
  recurso: Recurso;
  index: number;
  onShowDetails: (recurso: Recurso) => void;
}

const RecursoCard: React.FC<RecursoCardProps> = ({ recurso, index, onShowDetails }) => {
  const handleShowDetails = () => {
    onShowDetails(recurso);
  };

  const handleDragStart = (e: React.DragEvent) => {
    const recursoData = {
      type: 'recurso',
      nombre: recurso.nombre || 'Sin nombre',
      link: recurso.link || '',
      icono: recurso.icono || '',
      proyecto_id: recurso.proyecto_id || null,
      id: recurso.id
    };

    e.dataTransfer.setData('application/json', JSON.stringify(recursoData));
    e.dataTransfer.setData('text/plain', `Recurso - ${recurso.nombre || 'Sin nombre'}`);
  };

  return (
    <div
      className="bg-slate-600 rounded-xl p-1 w-19 h-19 flex flex-col justify-between items-start shadow-lg relative cursor-pointer hover:bg-slate-500 transition-colors"
      draggable
      onDragStart={handleDragStart}
      onClick={handleShowDetails}
      title={`${recurso.nombre || 'Sin nombre'} - ${recurso.link ? 'Con enlace' : 'Sin enlace'}`}
    >
      {/* Franja superior */}
      <div className="absolute top-0 left-0 right-0 h-5 bg-slate-700 rounded-t-xl"></div>

      {/* Indicador de estado */}
      <div className="flex justify-start w-full relative z-10">
        <div className="w-3 h-3 rounded-full bg-blue-400 transition-colors duration-300" />
      </div>

      {/* Información del recurso */}
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="text-center">
          <div className="text-white text-lg">
            {recurso.icono || '📚'}
          </div>
          <div className="text-white/70 text-xs mt-1 truncate max-w-16">
            {recurso.nombre || 'Sin nombre'}
          </div>
        </div>
      </div>

      {/* Icono de enlace decorativo */}
      <div className="flex justify-end w-full">
        <div className="text-white p-1">
          <ExternalLink size={12} />
        </div>
      </div>
    </div>
  );
};

export default function RecursosGrid() {
  const { usuario } = useAuth();
  const { recursos, loading, error } = useRecursos(usuario?.id || null);
  const [showRecursoDetails, setShowRecursoDetails] = useState(false);
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);

  const handleShowDetails = (recurso: Recurso) => {
    setSelectedRecurso(recurso);
    setShowRecursoDetails(true);
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

  if (recursos.length === 0) {
    return (
      <div className="bg-slate-600/50 rounded-xl p-4 w-19 h-19 flex items-center justify-center shadow-lg">
        <div className="text-white/70 text-xs text-center">
          Sin recursos
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {recursos.map((recurso, index) => (
          <RecursoCard
            key={recurso.id}
            recurso={recurso}
            index={index}
            onShowDetails={handleShowDetails}
          />
        ))}
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
        {selectedRecurso && (
          <div className="text-black space-y-6 p-4">
            {/* Nombre */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Nombre</h3>
              <p className="text-gray-700">{selectedRecurso.nombre || 'Sin nombre'}</p>
            </div>

            {/* Icono */}
            {selectedRecurso.icono && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Icono</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <span className="text-2xl">{selectedRecurso.icono}</span>
                </div>
              </div>
            )}

            {/* Enlace */}
            {selectedRecurso.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enlace</h3>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="text-blue-800 break-all mb-2">{selectedRecurso.link}</p>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    onClick={() => window.open(selectedRecurso.link!, '_blank')}
                  >
                    Abrir enlace
                  </button>
                </div>
              </div>
            )}

            {/* Proyecto ID */}
            {selectedRecurso.proyecto_id && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Proyecto</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800">ID: {selectedRecurso.proyecto_id}</p>
                </div>
              </div>
            )}

            {/* Fecha de creación */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha de Creación</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700">
                  {new Date(selectedRecurso.created_at).toLocaleDateString('es-ES', {
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