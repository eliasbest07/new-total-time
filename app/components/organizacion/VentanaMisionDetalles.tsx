'use client';

import { useState, useEffect, useRef } from 'react';
import Ventana from '@/app/demo/components/Ventana';
import { Mision } from '@/domain/entities/Mision';
import { Usuario } from '@/domain/entities/Usuario';
import { Proyecto } from '@/domain/entities/Proyecto';
import { Capture } from '@/domain/entities/Capture';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Pencil, Check, X, ChevronDown, MessageCircle, Folder } from 'lucide-react';

const captureRepository = new CaptureRepositorySupabase();

interface VentanaMisionDetallesProps {
  isOpen: boolean;
  onClose: () => void;
  mision: Mision | null;
  usuarios?: Usuario[];
  proyectos?: Proyecto[];
  currentUserId?: string;
  onOpenChat?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  onMisionUpdated?: () => void;
}

// Helpers para fechas
const formatDateForDisplay = (isoDate: string | null): string => {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return isoDate;
  }
};

const formatDateForInput = (isoDate: string | null): string => {
  if (!isoDate) return '';
  try {
    // Extraer solo YYYY-MM-DD del ISO string
    return isoDate.split('T')[0];
  } catch {
    return '';
  }
};

const formatDateForSave = (dateInput: string): string | null => {
  if (!dateInput) return null;
  // Convertir YYYY-MM-DD a ISO con timezone
  return `${dateInput}T00:00:00+00:00`;
};

// Componente para campo editable inline
const EditableField: React.FC<{
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  type?: 'text' | 'number' | 'date';
  className?: string;
  displayClassName?: string;
}> = ({ value, onSave, placeholder = '', multiline = false, type = 'text', className = '', displayClassName = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(type === 'date' ? formatDateForInput(value) : value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(type === 'date' ? formatDateForInput(value) : value);
  }, [value, type]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    // Para fechas, convertir al formato ISO antes de guardar
    const valueToSave = type === 'date' ? (formatDateForSave(editValue) || '') : editValue;
    onSave(valueToSave);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(type === 'date' ? formatDateForInput(value) : value);
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
            style={type === 'date' ? { colorScheme: 'light' } : undefined}
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

  // Para fechas, mostrar formateado; para otros tipos, mostrar tal cual
  const displayValue = type === 'date' ? formatDateForDisplay(value) : value;

  return (
    <div
      className={`group flex items-start gap-2 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-2 px-2 py-1 ${displayClassName}`}
      onClick={() => setIsEditing(true)}
    >
      <span className={`flex-1 ${!displayValue ? 'text-gray-400 italic' : ''}`}>
        {displayValue || placeholder || 'Sin contenido'}
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

// Componente para selector de usuario
const UserSelector: React.FC<{
  selectedUserId: number | null;
  usuarios: Usuario[];
  onSelect: (userId: number | null) => void;
}> = ({ selectedUserId, usuarios, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedUser = usuarios.find(u => parseInt(u.id) === selectedUserId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="group flex items-center gap-2 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-2 px-2 py-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 flex-1">
            {selectedUser.profile.avatar ? (
              <img
                src={selectedUser.profile.avatar}
                alt={selectedUser.getNombreCompleto()}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {selectedUser.profile.nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-gray-900">{selectedUser.getNombreCompleto()}</span>
          </div>
        ) : (
          <span className="flex-1 text-gray-400 italic">Sin asignar</span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
          >
            <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
              <X size={14} className="text-gray-500" />
            </div>
            <span className="text-gray-500">Sin asignar</span>
          </button>

          {usuarios.map((usuario) => {
            const usuarioIdNum = parseInt(usuario.id);
            return (
              <button
                key={usuario.id}
                onClick={() => {
                  onSelect(usuarioIdNum);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${
                  selectedUserId === usuarioIdNum ? 'bg-blue-50' : ''
                }`}
              >
                {usuario.profile.avatar ? (
                  <img
                    src={usuario.profile.avatar}
                    alt={usuario.getNombreCompleto()}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                    {usuario.profile.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 text-sm truncate">{usuario.getNombreCompleto()}</p>
                  <p className="text-xs text-gray-500 truncate">@{usuario.profile.username}</p>
                </div>
                {selectedUserId === usuarioIdNum && (
                  <Check size={16} className="text-blue-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Componente para selector de proyecto
const ProjectSelector: React.FC<{
  selectedProjectId: number | null;
  proyectos: Proyecto[];
  onSelect: (projectId: number | null) => void;
}> = ({ selectedProjectId, proyectos, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = proyectos.find(p => p.id === selectedProjectId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obtener color del proyecto
  const getProjectColor = (proyecto: Proyecto) => {
    if (proyecto.colors && proyecto.colors.length > 0) {
      return proyecto.colors[0];
    }
    return '#6366f1'; // indigo por defecto
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="group flex items-center gap-2 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-2 px-2 py-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedProject ? (
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm overflow-hidden"
              style={{ backgroundColor: getProjectColor(selectedProject) }}
            >
              {selectedProject.icono ? (
                <img
                  src={selectedProject.icono}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <Folder size={14} className={selectedProject.icono ? 'hidden' : ''} />
            </div>
            <span className="text-gray-900">{selectedProject.nombre || 'Sin nombre'}</span>
          </div>
        ) : (
          <span className="flex-1 text-gray-400 italic">Sin proyecto</span>
        )}
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <button
            onClick={() => {
              onSelect(null);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
          >
            <div className="w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center">
              <X size={14} className="text-gray-500" />
            </div>
            <span className="text-gray-500">Sin proyecto</span>
          </button>

          {proyectos.map((proyecto) => (
            <button
              key={proyecto.id}
              onClick={() => {
                onSelect(proyecto.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${
                selectedProjectId === proyecto.id ? 'bg-blue-50' : ''
              }`}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm overflow-hidden"
                style={{ backgroundColor: getProjectColor(proyecto) }}
              >
                {proyecto.icono ? (
                  <img
                    src={proyecto.icono}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <Folder size={14} className={proyecto.icono ? 'hidden' : ''} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm truncate">{proyecto.nombre || 'Sin nombre'}</p>
                {proyecto.descripcion && (
                  <p className="text-xs text-gray-500 truncate">{proyecto.descripcion}</p>
                )}
              </div>
              {selectedProjectId === proyecto.id && (
                <Check size={16} className="text-blue-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Componente para selector de estado
const StatusSelector: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const estados = [
    { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'en_progreso', label: 'En Progreso', color: 'bg-blue-100 text-blue-800' },
    { value: 'completada', label: 'Completada', color: 'bg-green-100 text-green-800' },
    { value: 'entregada', label: 'Entregada', color: 'bg-purple-100 text-purple-800' },
    { value: 'revisada', label: 'Revisada', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-800' },
  ];

  const currentEstado = estados.find(e => e.value === value) || estados[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="group flex items-center gap-2 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors -mx-2 px-2 py-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${currentEstado.color}`}>
          {currentEstado.label}
        </span>
        <Pencil size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 min-w-40">
          {estados.map((estado) => (
            <button
              key={estado.value}
              onClick={() => {
                onChange(estado.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${
                value === estado.value ? 'bg-gray-50' : ''
              }`}
            >
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
                {estado.label}
              </span>
              {value === estado.value && (
                <Check size={14} className="text-blue-500 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const VentanaMisionDetalles: React.FC<VentanaMisionDetallesProps> = ({
  isOpen,
  onClose,
  mision,
  usuarios = [],
  proyectos = [],
  currentUserId,
  onOpenChat,
  onMisionUpdated
}) => {
  const [misionCaptures, setMisionCaptures] = useState<Capture[]>([]);
  const [loadingMisionCaptures, setLoadingMisionCaptures] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Estado local de la misión para edición
  const [localMision, setLocalMision] = useState<{
    nombre: string;
    descripcion: string;
    horas: string;
    fecha_start: string;
    fecha_end: string;
    estado: string;
    id_usuario: number | null;
    id_proyecto: number | null;
  }>({
    nombre: '',
    descripcion: '',
    horas: '',
    fecha_start: '',
    fecha_end: '',
    estado: 'pendiente',
    id_usuario: null,
    id_proyecto: null
  });

  // Inicializar estado local cuando cambia la misión
  useEffect(() => {
    if (mision && isOpen) {
      setLocalMision({
        nombre: mision.nombre || '',
        descripcion: mision.descripcion || '',
        horas: mision.horas?.toString() || '',
        fecha_start: mision.fecha_start || '',
        fecha_end: mision.fecha_end || '',
        estado: mision.estado || 'pendiente',
        id_usuario: mision.id_usuario || null,
        id_proyecto: mision.id_proyecto || null
      });
    }
  }, [mision, isOpen]);

  // Cargar capturas
  useEffect(() => {
    if (!isOpen || !mision || !currentUserId) {
      setMisionCaptures([]);
      return;
    }

    const loadCaptures = async () => {
      setLoadingMisionCaptures(true);
      try {
        const captures = await captureRepository.getByUsuarioAndBloque(currentUserId, String(mision.id));
        setMisionCaptures(captures);
      } catch (error) {
        console.error('Error cargando capturas:', error);
        setMisionCaptures([]);
      } finally {
        setLoadingMisionCaptures(false);
      }
    };

    loadCaptures();
  }, [isOpen, mision, currentUserId]);

  // Guardar campo individual
  const saveField = async (field: string, value: any) => {
    if (!mision) return;

    setSaving(true);
    try {
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');

      const updates: any = { [field]: value };

      // Convertir horas a número si es necesario
      if (field === 'horas') {
        updates.horas = value ? parseInt(value) : null;
      }

      const { error } = await supabase
        .from('misiones')
        .update(updates)
        .eq('id', mision.id);

      if (error) {
        console.error('[VentanaMisionDetalles] Error guardando:', error);
        return;
      }

      // Si se cambió el estado, también actualizar misiones_activas
      if (field === 'estado') {
        console.log(`[VentanaMisionDetalles] Actualizando estado a "${value}" - sincronizando misiones_activas`);

        // Mapear estados de misiones a estados válidos de misiones_activas
        // misiones_activas acepta: 'pendiente' | 'en_progreso' | 'pausada' | 'entregada' | 'aprobada' | 'rechazada' | 'cancelada'
        const estadoMisionActivaMap: Record<string, string> = {
          'pendiente': 'pendiente',
          'en_progreso': 'en_progreso',
          'completada': 'entregada',  // completada -> entregada
          'entregada': 'entregada',
          'revisada': 'aprobada',     // revisada -> aprobada
          'cancelada': 'cancelada'
        };

        const estadoMisionActiva = estadoMisionActivaMap[value] || 'pendiente';
        const isRunning = value === 'en_progreso';

        const { error: errorMisionActiva } = await supabase
          .from('misiones_activas')
          .update({
            estado: estadoMisionActiva,
            is_running: isRunning
          })
          .eq('id_referencia', mision.id)
          .eq('tipo', 'mision');

        if (errorMisionActiva) {
          console.error('[VentanaMisionDetalles] Error actualizando misiones_activas:', errorMisionActiva);
        } else {
          console.log(`[VentanaMisionDetalles] misiones_activas actualizado: estado="${estadoMisionActiva}", is_running=${isRunning}`);
        }
      }

      // Actualizar estado local
      setLocalMision(prev => ({ ...prev, [field]: value }));

      // Notificar actualización
      if (onMisionUpdated) {
        onMisionUpdated();
      }
    } catch (error) {
      console.error('[VentanaMisionDetalles] Error guardando campo:', error);
    } finally {
      setSaving(false);
    }
  };

  // Formatear fecha para mostrar
  const formatDate = (fecha: string | null) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Usuario asignado (comparar id numérico)
  const usuarioAsignado = usuarios.find(u => parseInt(u.id) === localMision.id_usuario);

  // Handler para chat
  const handleOpenChat = () => {
    if (!usuarioAsignado || !onOpenChat) return;
    onOpenChat({
      userId: usuarioAsignado.userAuth,
      name: usuarioAsignado.getNombreCompleto(),
      avatar: usuarioAsignado.profile.avatar,
      color: usuarioAsignado.profile.marco,
      online: true
    });
    setChatMessage('');
  };

  if (!mision) return null;

  return (
    <Ventana
      isOpen={isOpen}
      onClose={onClose}
      title={`🎯 ${mision.nombre || 'Ticket'}`}
      initialWidth={580}
      initialHeight={700}
      minWidth={480}
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

        {/* Nombre - Grande y destacado */}
        <div className="mb-6">
          <EditableField
            value={localMision.nombre}
            onSave={(v) => saveField('nombre', v)}
            placeholder="Sin título"
            displayClassName="text-2xl font-bold text-gray-900"
            className="text-xl font-bold"
          />
        </div>

        {/* Propiedades en formato tabla */}
        <div className="space-y-3 mb-6">
          {/* Estado */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Estado</span>
            <StatusSelector
              value={localMision.estado}
              onChange={(v) => saveField('estado', v)}
            />
          </div>

          {/* Asignado a */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Asignado a</span>
            <div className="flex-1">
              <UserSelector
                selectedUserId={localMision.id_usuario}
                usuarios={usuarios}
                onSelect={(v) => saveField('id_usuario', v)}
              />
            </div>
          </div>

          {/* Proyecto */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Proyecto</span>
            <div className="flex-1">
              <ProjectSelector
                selectedProjectId={localMision.id_proyecto}
                proyectos={proyectos}
                onSelect={(v) => saveField('id_proyecto', v)}
              />
            </div>
          </div>

          {/* Fecha inicio */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Inicio</span>
            <div className="flex-1">
              <EditableField
                value={localMision.fecha_start}
                onSave={(v) => saveField('fecha_start', v)}
                placeholder="Sin fecha"
                type="date"
                displayClassName="text-gray-700"
              />
            </div>
          </div>

          {/* Fecha fin */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Fin</span>
            <div className="flex-1">
              <EditableField
                value={localMision.fecha_end}
                onSave={(v) => saveField('fecha_end', v)}
                placeholder="Sin fecha"
                type="date"
                displayClassName="text-gray-700"
              />
            </div>
          </div>

          {/* Horas */}
          <div className="flex items-center py-1.5 border-b border-gray-100">
            <span className="w-28 text-sm text-gray-500 flex-shrink-0">Horas</span>
            <div className="flex-1">
              <EditableField
                value={localMision.horas}
                onSave={(v) => saveField('horas', v)}
                placeholder="0"
                type="number"
                displayClassName="text-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Descripción */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-2">Descripción</h3>
          <EditableField
            value={localMision.descripcion}
            onSave={(v) => saveField('descripcion', v)}
            placeholder="Añadir descripción..."
            multiline
            displayClassName="text-gray-700 whitespace-pre-wrap"
          />
        </div>

        {/* Capturas */}
        <div className="mb-6">
          <h3 className="text-sm text-gray-500 mb-2">
            Capturas ({misionCaptures.length}) • {misionCaptures.length * 5} min
          </h3>
          {loadingMisionCaptures ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : misionCaptures.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No hay capturas</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {misionCaptures.slice(0, 8).map((capture) => (
                <div
                  key={capture.id}
                  className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => capture.img_url && window.open(capture.img_url, '_blank')}
                >
                  <img
                    src={capture.img_url || '/placeholder-image.png'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
              {misionCaptures.length > 8 && (
                <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                  +{misionCaptures.length - 8}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat con responsable - solo si no es el usuario actual */}
        {usuarioAsignado && onOpenChat && usuarioAsignado.userAuth !== currentUserId && (
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {usuarioAsignado.profile.avatar ? (
                  <img
                    src={usuarioAsignado.profile.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {usuarioAsignado.profile.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder={`Mensaje a ${usuarioAsignado.profile.nombre}...`}
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && chatMessage.trim()) {
                      handleOpenChat();
                    }
                  }}
                />
              </div>
              <button
                onClick={handleOpenChat}
                disabled={!chatMessage.trim()}
                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                title="Enviar mensaje"
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Info técnica - Colapsada */}
        <details className="mt-6 text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Info técnica</summary>
          <div className="mt-2 space-y-1 pl-4">
            <p>ID: {mision.id}</p>
            {mision.id_proyecto && <p>Proyecto: {mision.id_proyecto}</p>}
          </div>
        </details>
      </div>
    </Ventana>
  );
};

export default VentanaMisionDetalles;
