'use client';

import { useState } from 'react';
import {
  FileText,
  Image,
  Video,
  Download,
  Link,
  Code,
  Archive,
  FolderOpen,
  Save,
  X,
  LucideIcon
} from 'lucide-react';

interface IconOption {
  name: string;
  icon: LucideIcon;
  color: string;
}

interface AddResourceFormProps {
  onSave: (resource: {
    name: string;
    icon: LucideIcon;
    color: string;
    type: string;
    url: string;
    description: string;
  }) => void;
  onClose: () => void;
}

const AddResourceForm = ({ onSave, onClose }: AddResourceFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    selectedIcon: 0
  });

  const iconOptions: IconOption[] = [
    { name: 'Documento', icon: FileText, color: 'bg-blue-500' },
    { name: 'Imagen', icon: Image, color: 'bg-green-500' },
    { name: 'Video', icon: Video, color: 'bg-purple-500' },
    { name: 'Archivo', icon: Download, color: 'bg-orange-500' },
    { name: 'Enlace', icon: Link, color: 'bg-cyan-500' },
    { name: 'Código', icon: Code, color: 'bg-pink-500' },
    { name: 'Archivos', icon: Archive, color: 'bg-red-500' },
    { name: 'Carpeta', icon: FolderOpen, color: 'bg-indigo-500' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.url.trim()) {
      return;
    }

    const selectedIconData = iconOptions[formData.selectedIcon];
    
    onSave({
      name: formData.name.trim(),
      icon: selectedIconData.icon,
      color: selectedIconData.color,
      type: selectedIconData.name.toUpperCase().substring(0, 3),
      url: formData.url.trim(),
      description: formData.description.trim()
    });
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Añadir Recurso</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de icono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Seleccionar icono
          </label>
          <div className="grid grid-cols-4 gap-3">
            {iconOptions.map((option, index) => {
              const IconComponent = option.icon;
              const isSelected = formData.selectedIcon === index;
              
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, selectedIcon: index }))}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded ${option.color} flex items-center justify-center mx-auto mb-1`}>
                    <IconComponent size={16} className="text-white" />
                  </div>
                  <span className="text-xs text-gray-600 block text-center">
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Título del recurso */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Título del recurso
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ej: Tutorial React"
            required
          />
        </div>

        {/* URL del recurso */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            Enlace (URL)
          </label>
          <input
            type="url"
            id="url"
            value={formData.url}
            onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://ejemplo.com"
            required
          />
        </div>

        {/* Descripción */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Descripción (opcional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Breve descripción del recurso..."
          />
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!formData.name.trim() || !formData.url.trim()}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddResourceForm;