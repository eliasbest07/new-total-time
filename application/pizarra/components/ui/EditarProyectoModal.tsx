import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Plus, X } from 'lucide-react';

interface EditarProyectoModalProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: number | null;
  initialData: {
    github_url: string;
    sitio_web_url: string;
    tecnologias: string[];
  };
  onSave: (data: {
    github_url: string;
    sitio_web_url: string;
    tecnologias: string[];
  }) => Promise<void>;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const EditarProyectoModal: React.FC<EditarProyectoModalProps> = ({
  isOpen,
  onClose,
  proyectoId,
  initialData,
  onSave,
  onSuccess,
  onError,
}) => {
  const [githubUrl, setGithubUrl] = useState(initialData.github_url);
  const [sitioWebUrl, setSitioWebUrl] = useState(initialData.sitio_web_url);
  const [tecnologias, setTecnologias] = useState<string[]>(initialData.tecnologias);
  const [nuevaTecnologia, setNuevaTecnologia] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Reiniciar estado solo cuando el modal se abre por primera vez, no en re-renders
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setGithubUrl(initialData.github_url);
      setSitioWebUrl(initialData.sitio_web_url);
      setTecnologias(initialData.tecnologias);
      setNuevaTecnologia('');
      setIsInitialized(true);
    } else if (!isOpen) {
      // Resetear la flag cuando se cierra el modal
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized, initialData]);

  const handleAgregarTecnologia = () => {
    if (nuevaTecnologia.trim() && !tecnologias.includes(nuevaTecnologia.trim())) {
      setTecnologias([...tecnologias, nuevaTecnologia.trim()]);
      setNuevaTecnologia('');
    }
  };

  const handleEliminarTecnologia = (tech: string) => {
    setTecnologias(tecnologias.filter(t => t !== tech));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      console.log('📝 Guardando datos del modal:', {
        github_url: githubUrl,
        sitio_web_url: sitioWebUrl,
        tecnologias: tecnologias,
      });
      await onSave({
        github_url: githubUrl,
        sitio_web_url: sitioWebUrl,
        tecnologias: tecnologias,
      });
      onClose();
      // Mostrar notificación después de cerrar el modal
      setTimeout(() => {
        onSuccess?.('Proyecto actualizado exitosamente');
      }, 100);
    } catch (err) {
      console.error('❌ Error al guardar:', err);
      onError?.('Error al guardar los cambios');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      data-todo-interactive
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-todo-interactive
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Editar Proyecto</h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            data-todo-interactive
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">URL de GitHub</label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://github.com/usuario/repositorio"
              disabled={guardando}
              data-todo-interactive
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">URL del Sitio Web</label>
            <input
              type="url"
              value={sitioWebUrl}
              onChange={(e) => setSitioWebUrl(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://ejemplo.com"
              disabled={guardando}
              data-todo-interactive
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-900">Tecnologías</label>
            <div className="space-y-2">
              {/* Lista de tecnologías */}
              {tecnologias.length > 0 && (
                <div className="flex gap-2 flex-wrap p-3 bg-gray-50 rounded-lg">
                  {tecnologias.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-2"
                    >
                      {tech}
                      <button
                        onClick={() => handleEliminarTecnologia(tech)}
                        className="hover:text-red-600 transition-colors"
                        disabled={guardando}
                        data-todo-interactive
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Agregar nueva tecnología */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nuevaTecnologia}
                  onChange={(e) => setNuevaTecnologia(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAgregarTecnologia();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: React, TypeScript, Node.js"
                  disabled={guardando}
                  data-todo-interactive
                />
                <button
                  onClick={handleAgregarTecnologia}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                  disabled={guardando}
                  data-todo-interactive
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors disabled:opacity-50"
              disabled={guardando}
              data-todo-interactive
            >
              Cancelar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGuardar();
              }}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
              disabled={guardando}
              data-todo-interactive
            >
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar el modal usando un portal para que aparezca fuera del componente padre
  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};
