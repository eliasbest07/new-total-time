'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRecursos } from '@/hooks/useRecursos';
import Ventana from '@/app/demo/components/Ventana';


interface AgregarRecursoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AgregarRecursoModal: React.FC<AgregarRecursoModalProps> = ({ isOpen, onClose }) => {
    const { usuario } = useAuth();
    const { createRecurso } = useRecursos(usuario?.id || null);

    const [formData, setFormData] = useState({
        nombre: '',
        link: '',
        icono: '📚',
        proyecto_id: null as number | null
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Iconos disponibles con sus emojis correspondientes
    const iconosDisponibles = [
        { emoji: '📚', nombre: 'Libro', descripcion: 'Documentación, libros' },
        { emoji: '🔗', nombre: 'Enlace', descripcion: 'Enlaces web, URLs' },
        { emoji: '💻', nombre: 'Código', descripcion: 'Repositorios, código' },
        { emoji: '🖼️', nombre: 'Imagen', descripcion: 'Imágenes, diseños' },
        { emoji: '🎥', nombre: 'Video', descripcion: 'Videos, tutoriales' },
        { emoji: '📁', nombre: 'Carpeta', descripcion: 'Archivos, documentos' },
        { emoji: '🌐', nombre: 'Web', descripcion: 'Sitios web, aplicaciones' },
        { emoji: '📄', nombre: 'Documento', descripcion: 'PDFs, documentos' },
        { emoji: '⚙️', nombre: 'Herramienta', descripcion: 'Herramientas, utilidades' },
        { emoji: '🎯', nombre: 'Objetivo', descripcion: 'Metas, objetivos' },
        { emoji: '💡', nombre: 'Idea', descripcion: 'Ideas, conceptos' },
        { emoji: '🔧', nombre: 'Configuración', descripcion: 'Configuraciones, ajustes' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!usuario?.id) {
            setError('Usuario no autenticado');
            return;
        }

        if (!formData.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await createRecurso({
                nombre: formData.nombre.trim(),
                link: formData.link.trim() || null,
                icono: formData.icono,
                proyecto_id: formData.proyecto_id,
                id_usuario: usuario.id
            });

            // Recargar la página completa para mostrar el nuevo recurso
            window.location.reload();
        } catch (err) {
            console.error('Error creando recurso:', err);
            setError('Error al crear el recurso. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setFormData({
                nombre: '',
                link: '',
                icono: '📚',
                proyecto_id: null
            });
            setError(null);
            onClose();
        }
    };

    return (
        <Ventana
            isOpen={isOpen}
            onClose={handleClose}
            title="Agregar Nuevo Recurso"
            initialWidth={500}
            initialHeight={600}
            minWidth={450}
            minHeight={500}
            showOverlay={true}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nombre del recurso */}
                <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-900 mb-2">
                        Nombre del recurso *
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Ej: Documentación de React"
                        disabled={loading}
                        required
                    />
                </div>

                {/* Enlace */}
                <div>
                    <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
                        Enlace (opcional)
                    </label>
                    <input
                        type="url"
                        id="link"
                        value={formData.link}
                        onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="https://ejemplo.com"
                        disabled={loading}
                    />
                </div>

                {/* Selección de icono */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Icono del recurso
                    </label>
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                        {iconosDisponibles.map((icono) => (
                            <button
                                key={icono.emoji}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, icono: icono.emoji }))}
                                className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${formData.icono === icono.emoji
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                disabled={loading}
                                title={`${icono.nombre} - ${icono.descripcion}`}
                            >
                                <div className="text-2xl mb-1">{icono.emoji}</div>
                                <div className="text-xs text-gray-600 truncate">{icono.nombre}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Proyecto ID (opcional) */}
                <div>
                    <label htmlFor="proyecto_id" className="block text-sm font-medium text-gray-700 mb-2">
                        ID del Proyecto (opcional)
                    </label>
                    <input
                        type="number"
                        id="proyecto_id"
                        value={formData.proyecto_id || ''}
                        onChange={(e) => setFormData(prev => ({
                            ...prev,
                            proyecto_id: e.target.value ? parseInt(e.target.value) : null
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 text-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="Ej: 123"
                        disabled={loading}
                        min="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Asocia este recurso con un proyecto específico
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !formData.nombre.trim()}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Creando...
                            </>
                        ) : (
                            'Crear Recurso'
                        )}
                    </button>
                </div>
            </form>
        </Ventana>
    );
};

export default AgregarRecursoModal;