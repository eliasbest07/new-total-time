'use client';

import { useState, useEffect, useRef } from 'react';
import Ventana from '@/app/demo/components/Ventana';
import { Pencil, Check, X, Plus, Folder, Github, Globe, Code, Upload, Trash2, Image } from 'lucide-react';

interface VentanaEditarProyectoProps {
  isOpen: boolean;
  onClose: () => void;
  proyectoId: number | null;
  initialData: {
    nombre: string;
    descripcion: string | null;
    icono: string | null;
    github_url: string | null;
    sitio_web_url: string | null;
    tecnologias: string[] | null;
  };
  onProyectoUpdated?: () => void;
  showSuccess?: (message: string, duration?: number) => void;
  showError?: (message: string, duration?: number) => void;
}

// Componente para campo editable inline
const EditableField: React.FC<{
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: 'text' | 'url';
  className?: string;
  displayClassName?: string;
}> = ({ value, onSave, placeholder = '', multiline = false, type = 'text', className = '', displayClassName = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-3 py-2 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 resize-none bg-blue-50/50 ${className}`}
            rows={3}
            placeholder={placeholder}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`flex-1 px-3 py-1.5 border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-blue-50/50 ${className}`}
            placeholder={placeholder}
          />
        )}
        <button
          onClick={handleSave}
          className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
          title="Guardar"
        >
          <Check size={18} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Cancelar"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-start gap-2 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-2 px-2 py-1 ${displayClassName}`}
      onClick={() => setIsEditing(true)}
    >
      <span className={`flex-1 ${!value ? 'text-gray-400 italic' : ''}`}>
        {value || placeholder || 'Sin contenido'}
      </span>
      <button
        className="p-1 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-600 transition-all"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
};

// Componente para editar tecnologías
const TecnologiasEditor: React.FC<{
  tecnologias: string[];
  onSave: (tecnologias: string[]) => void;
}> = ({ tecnologias, onSave }) => {
  const [nuevaTecnologia, setNuevaTecnologia] = useState('');

  const handleAgregar = () => {
    if (nuevaTecnologia.trim() && !tecnologias.includes(nuevaTecnologia.trim())) {
      onSave([...tecnologias, nuevaTecnologia.trim()]);
      setNuevaTecnologia('');
    }
  };

  const handleEliminar = (tech: string) => {
    onSave(tecnologias.filter(t => t !== tech));
  };

  return (
    <div className="space-y-2">
      {/* Lista de tecnologías */}
      {tecnologias.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {tecnologias.map((tech, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-blue-100 border border-blue-300 text-blue-700 rounded-full text-xs font-semibold flex items-center gap-2"
            >
              {tech}
              <button
                onClick={() => handleEliminar(tech)}
                className="hover:text-red-600 transition-colors"
              >
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para agregar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={nuevaTecnologia}
          onChange={(e) => setNuevaTecnologia(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAgregar();
            }
          }}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          placeholder="Agregar tecnología..."
        />
        <button
          onClick={handleAgregar}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
};

const VentanaEditarProyecto: React.FC<VentanaEditarProyectoProps> = ({
  isOpen,
  onClose,
  proyectoId,
  initialData,
  onProyectoUpdated,
  showSuccess,
  showError
}) => {
  const [saving, setSaving] = useState(false);
  const [archivoImagen, setArchivoImagen] = useState<File | null>(null);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado local del proyecto
  const [localProyecto, setLocalProyecto] = useState({
    nombre: '',
    descripcion: '',
    icono: null as string | null,
    github_url: '',
    sitio_web_url: '',
    tecnologias: [] as string[]
  });

  // Inicializar estado cuando cambia el proyecto
  useEffect(() => {
    if (isOpen) {
      setLocalProyecto({
        nombre: initialData.nombre || '',
        descripcion: initialData.descripcion || '',
        icono: initialData.icono || null,
        github_url: initialData.github_url || '',
        sitio_web_url: initialData.sitio_web_url || '',
        tecnologias: initialData.tecnologias || []
      });
    }
  }, [isOpen, initialData]);

  // Guardar campo individual
  const saveField = async (field: string, value: any) => {
    if (!proyectoId) return;

    console.log(`[VentanaEditarProyecto] Guardando campo "${field}" con valor:`, value);

    setSaving(true);
    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const updates: any = { [field]: value };

      // Para tecnologías, convertir array vacío a null
      if (field === 'tecnologias') {
        updates[field] = value.length > 0 ? value : null;
      }

      // Para URLs vacías, guardar null
      if ((field === 'github_url' || field === 'sitio_web_url') && !value) {
        updates[field] = null;
      }

      const { data, error } = await supabase
        .from('proyecto')
        .update(updates)
        .eq('id', proyectoId)
        .select();

      if (error) {
        console.error('[VentanaEditarProyecto] Error guardando:', error);
        showError?.('Error al guardar los cambios');
        return;
      }

      // Actualizar estado local
      setLocalProyecto(prev => ({ ...prev, [field]: value }));

      // Notificar actualización
      if (onProyectoUpdated) {
        onProyectoUpdated();
      }
    } catch (error) {
      console.error('[VentanaEditarProyecto] Error guardando campo:', error);
      showError?.('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  // Subir imagen
  const handleSubirImagen = async () => {
    if (!archivoImagen || !proyectoId) return;

    if (!archivoImagen.type.startsWith('image/')) {
      showError?.('Por favor selecciona un archivo de imagen válido');
      return;
    }

    setSubiendoImagen(true);
    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Generar nombre único
      const fileExt = archivoImagen.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const folder = `proyecto-${proyectoId}`;
      const filePath = `${folder}/${fileName}`;

      // Eliminar imagen anterior si existe
      if (localProyecto.icono && localProyecto.icono.startsWith('http')) {
        try {
          const oldPath = localProyecto.icono.split('/').slice(-2).join('/');
          await supabase.storage.from('imagenes-proyectos').remove([oldPath]);
        } catch (e) {
          console.error('Error eliminando imagen anterior:', e);
        }
      }

      // Subir nueva imagen
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imagenes-proyectos')
        .upload(filePath, archivoImagen, {
          contentType: archivoImagen.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError);
        showError?.('Error al subir la imagen');
        return;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('imagenes-proyectos')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Actualizar BD
      await saveField('icono', publicUrl);

      setArchivoImagen(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      showSuccess?.('Imagen actualizada');
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      showError?.('Error al subir la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  // Eliminar imagen
  const handleEliminarImagen = async () => {
    if (!proyectoId) return;

    if (!confirm('¿Eliminar la imagen del proyecto?')) return;

    setSubiendoImagen(true);
    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      // Eliminar del storage
      if (localProyecto.icono && localProyecto.icono.startsWith('http')) {
        try {
          const oldPath = localProyecto.icono.split('/').slice(-2).join('/');
          await supabase.storage.from('imagenes-proyectos').remove([oldPath]);
        } catch (e) {
          console.error('Error eliminando del storage:', e);
        }
      }

      // Actualizar BD
      await saveField('icono', null);
      showSuccess?.('Imagen eliminada');
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      showError?.('Error al eliminar la imagen');
    } finally {
      setSubiendoImagen(false);
    }
  };

  if (!proyectoId) return null;

  return (
    <Ventana
      isOpen={isOpen}
      onClose={onClose}
      title=""
      initialWidth={560}
      initialHeight={620}
      minWidth={450}
      minHeight={400}
      showOverlay={false}
    >
      <div className="text-black p-5 overflow-y-auto max-h-[calc(100%-1rem)]">
        {/* Indicador de guardado */}
        {saving && (
          <div className="fixed top-3 right-3 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando...
          </div>
        )}

        {/* Header con icono */}
        <div className="mb-6 flex items-start gap-4">
          {/* Icono del proyecto */}
          <div className="relative group">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {localProyecto.icono ? (
                <img
                  src={localProyecto.icono}
                  alt={localProyecto.nombre}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Folder size={32} className="text-gray-400" />
              )}
            </div>

            {/* Overlay para cambiar imagen */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
                title="Cambiar imagen"
              >
                <Upload size={16} className="text-gray-700" />
              </button>
              {localProyecto.icono && (
                <button
                  onClick={handleEliminarImagen}
                  className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors"
                  title="Eliminar imagen"
                  disabled={subiendoImagen}
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              )}
            </div>
          </div>

          {/* Nombre del proyecto */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              <EditableField
                value={localProyecto.nombre}
                onSave={(v) => saveField('nombre', v)}
                placeholder="Nombre del proyecto"
                displayClassName="text-xl font-bold"
              />
            </h2>
            <p className="text-sm text-gray-500">ID: {proyectoId}</p>
          </div>
        </div>

        {/* Input oculto para archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setArchivoImagen(file);
            }
          }}
        />

        {/* Mostrar archivo seleccionado */}
        {archivoImagen && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image size={16} className="text-blue-600" />
              <span className="text-sm text-gray-700">{archivoImagen.name}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubirImagen}
                disabled={subiendoImagen}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                {subiendoImagen ? 'Subiendo...' : 'Subir'}
              </button>
              <button
                onClick={() => {
                  setArchivoImagen(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-2">Descripción</h3>
          <EditableField
            value={localProyecto.descripcion}
            onSave={(v) => saveField('descripcion', v)}
            placeholder="Añadir descripción del proyecto..."
            multiline
            displayClassName="text-gray-700 whitespace-pre-wrap"
          />
        </div>

        {/* Propiedades */}
        <div className="space-y-3 mb-6">
          {/* GitHub URL */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-32 text-sm text-gray-500 flex-shrink-0 flex items-center gap-2">
              <Github size={16} />
              GitHub
            </span>
            <div className="flex-1">
              <EditableField
                value={localProyecto.github_url}
                onSave={(v) => saveField('github_url', v)}
                placeholder="https://github.com/..."
                type="url"
                displayClassName="text-blue-600 hover:underline"
              />
            </div>
          </div>

          {/* Sitio Web URL */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-32 text-sm text-gray-500 flex-shrink-0 flex items-center gap-2">
              <Globe size={16} />
              Sitio Web
            </span>
            <div className="flex-1">
              <EditableField
                value={localProyecto.sitio_web_url}
                onSave={(v) => saveField('sitio_web_url', v)}
                placeholder="https://..."
                type="url"
                displayClassName="text-blue-600 hover:underline"
              />
            </div>
          </div>

          {/* Tecnologías */}
          <div className="py-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Code size={16} className="text-gray-500" />
              <span className="text-sm text-gray-500">Tecnologías</span>
            </div>
            <TecnologiasEditor
              tecnologias={localProyecto.tecnologias}
              onSave={(techs) => saveField('tecnologias', techs)}
            />
          </div>
        </div>

        {/* Info técnica */}
        <details className="mt-6 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Info técnica</summary>
          <div className="mt-2 space-y-1 pl-4">
            <p>ID del proyecto: {proyectoId}</p>
          </div>
        </details>
      </div>
    </Ventana>
  );
};

export default VentanaEditarProyecto;
