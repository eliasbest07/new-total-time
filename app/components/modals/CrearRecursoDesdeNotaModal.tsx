'use client';

import { useState } from 'react';
import Ventana from '@/app/demo/components/Ventana';

interface CrearRecursoDesdeNotaModalProps {
    isOpen: boolean;
    onClose: () => void;
    notaContent: string;
    notaTitle: string;
    proyectoId: number;
    proyectoNombre: string;
    onConfirm: (data: {
        nombre: string;
        link: string | null;
        icono: string;
    }) => Promise<void>;
}

const CrearRecursoDesdeNotaModal: React.FC<CrearRecursoDesdeNotaModalProps> = ({
    isOpen,
    onClose,
    notaContent,
    notaTitle,
    proyectoNombre,
    onConfirm
}) => {
    const [formData, setFormData] = useState({
        nombre: notaTitle || 'Recurso desde nota',
        link: '',
        icono: '📝'
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Iconos disponibles con sus emojis correspondientes
    const iconosDisponibles = [
        { emoji: '📝', nombre: 'Nota', descripcion: 'Notas, apuntes' },
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
        { emoji: '💡', nombre: 'Idea', descripcion: 'Ideas, conceptos' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await onConfirm({
                nombre: formData.nombre.trim(),
                link: formData.link.trim() || null,
                icono: formData.icono
            });
            handleClose();
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
                nombre: notaTitle || 'Recurso desde nota',
                link: '',
                icono: '📝'
            });
            setError(null);
            onClose();
        }
    };

    return (
        <Ventana
            isOpen={isOpen}
            onClose={handleClose}
            title="Crear Recurso desde Nota"
            initialWidth={500}
            initialHeight={550}
            minWidth={450}
            minHeight={500}
            showOverlay={true}
        >
            <div className="space-y-4">
                {/* Info del proyecto */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">
                        <span className="font-semibold">Proyecto:</span> {proyectoNombre}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                        Se creará un recurso vinculado a este proyecto
                    </p>
                </div>

                {/* Contenido de la nota (preview) */}
                {notaContent && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Contenido de la nota:</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{notaContent}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="Ej: Documentación importante"
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
                            className="w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="https://ejemplo.com"
                            disabled={loading}
                        />
                    </div>

                    {/* Selección de icono */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Icono del recurso
                        </label>
                        <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                            {iconosDisponibles.map((icono) => (
                                <button
                                    key={icono.emoji}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, icono: icono.emoji }))}
                                    className={`p-2 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${formData.icono === icono.emoji
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    disabled={loading}
                                    title={`${icono.nombre} - ${icono.descripcion}`}
                                >
                                    <div className="text-xl">{icono.emoji}</div>
                                </button>
                            ))}
                        </div>
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
            </div>
        </Ventana>
    );
};

export default CrearRecursoDesdeNotaModal;
