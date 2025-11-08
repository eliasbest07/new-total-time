'use client';

import { useState, useRef } from 'react';
import {
  ChevronDown,
  Users,
  FolderOpen,
  Archive,
  Clock,
  Plus,
  ChevronUp,
  LucideIcon
} from 'lucide-react';
import { Resource } from '../utils/resourceUtils';
import { Usuario } from '@/domain/entities/Usuario';
import Ventana from './Ventana';
import { Proyecto } from '@/domain/entities/Proyecto';
import { useAuth } from '@/app/contexts/AuthContext';
import { createPortal } from 'react-dom';


// Tipos/Interfaces
interface User {
  id: number;
  name: string;
  status: string;
  avatar: string;
  color: string;
  online: boolean;
}

interface ProyectoConvertido {
  id: number;
  nombre: string;
  descripcion: string;
  fechaCreacion: string;
  estado: string;
  colores: {
    primario: string;
    secundario: string;
    acento: string;
  };
}



interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  content: string | string[];
}

// Props interface
interface AccordionProps {
  recursos: Resource[];
  proyectos?: import('@/domain/entities/Proyecto').Proyecto[];
  usuarios?: Usuario[];
  onAddResource: () => void;
  onUserClick?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  onProyectoClick?: (proyecto: import('@/domain/entities/Proyecto').Proyecto) => void;
}

// Componente Principal
const Accordion: React.FC<AccordionProps> = ({ recursos, proyectos = [], usuarios = [], onAddResource, onUserClick, onProyectoClick }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showProyectoDetails, setShowProyectoDetails] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [currentUserPage, setCurrentUserPage] = useState<number>(1);
  const [currentProyectoPage, setCurrentProyectoPage] = useState<number>(1);
  const [hoveredRecurso, setHoveredRecurso] = useState<{ name: string; url?: string; x: number; y: number } | null>(null);
  const dragImageRef = useRef<HTMLDivElement>(null);

  // Obtener el estado de presencia desde AuthContext
  const { isUserOnline: checkUserOnline, onlineUsers } = useAuth();

  const USERS_PER_PAGE = 4;
  const PROYECTOS_PER_PAGE = 2;

  // Función para convertir usuarios de Supabase al formato del Accordion
  const convertirUsuariosSupabase = () => {
    // console.log('🔍 Accordion: Convirtiendo usuarios. Total de usuarios online en Presence:', onlineUsers.length);
    // console.log('🔍 Accordion: Usuarios online en Presence:', onlineUsers.map(u => ({ id: u.user_id, username: u.username })));

    return usuarios.map((usuario, index) => {
      // IMPORTANTE: Usar userAuth (UUID de Supabase) para verificar presencia
      const online = checkUserOnline(usuario.userAuth);

      // console.log(`🔍 Accordion: Usuario ${usuario.getNombreCompleto()} (userAuth: ${usuario.userAuth}) -> Online: ${online}`);

      return {
        id: parseInt(usuario.id) || index,
        userAuth: usuario.userAuth, // UUID para Supabase
        name: usuario.getNombreCompleto(),
        status: online ? 'En línea' : getStatusFromActivity(usuario.ultimaActividad),
        avatar: usuario.profile.avatar || getAvatarFromName(usuario.getNombreCompleto()), // Usar avatar real de Supabase
        color: usuario.profile.marco || getColorForUser(index), // Usar color del marco
        online: online
      };
    });
  };

  // Función para obtener estado basado en última actividad
  const getStatusFromActivity = (ultimaActividad: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - ultimaActividad.getTime()) / (1000 * 60));
    
    if (diffMinutes < 5) return 'En línea';
    if (diffMinutes < 30) return `Activa hace ${diffMinutes} min`;
    if (diffMinutes < 60) return 'Activa hace menos de 1 hora';
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Activa hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    const diffDays = Math.floor(diffHours / 24);
    return `Activa hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  };

  // Función para obtener avatar de las iniciales del nombre
  const getAvatarFromName = (name: string) => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Función para determinar si el usuario está online (activo en los últimos 5 minutos)
  const isUserOnline = (ultimaActividad: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - ultimaActividad.getTime()) / (1000 * 60));
    return diffMinutes < 5;
  };

  // Función para obtener color basado en el índice
  const getColorForUser = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500',
      'bg-green-600',
      'bg-yellow-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const allUsers = convertirUsuariosSupabase();
  const totalUserPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
  const startUserIndex = (currentUserPage - 1) * USERS_PER_PAGE;
  const endUserIndex = startUserIndex + USERS_PER_PAGE;
  const currentUsers = allUsers.slice(startUserIndex, endUserIndex);

  // Función para convertir proyectos de Supabase al formato del Accordion
  const convertirProyectosSupabase = (): ProyectoConvertido[] => {
    return proyectos.map((proyecto) => ({
      id: proyecto.id,
      nombre: proyecto.nombre || 'Sin nombre',
      descripcion: proyecto.descripcion || 'Sin descripción',
      fechaCreacion: proyecto.created_at.split('T')[0], // Convertir timestamp a fecha
      estado: getEstadoFromType(null), // type ya no existe en la tabla
      colores: {
        primario: proyecto.colors?.[0] || '#3B82F6',
        secundario: proyecto.colors?.[1] || '#1E40AF',
        acento: proyecto.colors?.[2] || '#60A5FA'
      }
    }));
  };

  // Función para obtener estado basado en el tipo
  const getEstadoFromType = (type: string | null) => {
    if (!type) return 'Sin estado';
    
    const estadoMap: { [key: string]: string } = {
      'development': 'En desarrollo',
      'review': 'En revisión',
      'completed': 'Completado',
      'active': 'En desarrollo',
      'inactive': 'Pausado'
    };
    
    return estadoMap[type.toLowerCase()] || 'En desarrollo';
  };

  const proyectosConvertidos = convertirProyectosSupabase();
  const totalProyectoPages = Math.ceil(proyectos.length / PROYECTOS_PER_PAGE);
  const startProyectoIndex = (currentProyectoPage - 1) * PROYECTOS_PER_PAGE;
  const endProyectoIndex = startProyectoIndex + PROYECTOS_PER_PAGE;
  const currentProyectos = proyectos.slice(startProyectoIndex, endProyectoIndex);

  const sections: Section[] = [
    {
      id: 'usuarios',
      title: `Usuarios conectados`,
      icon: Users,
      color: 'bg-green-500',
      content: 'users'
    },
    {
      id: 'proyectos',
      title: 'Proyectos',
      icon: FolderOpen,
      color: 'bg-blue-500',
      content: 'projects'
    },
    {
      id: 'recursos',
      title: 'Recursos',
      icon: Archive,
      color: 'bg-red-500',
      content: 'resources'
    }
  ];

  const toggleSection = (sectionId: string): void => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleAddResource = (): void => {
    console.log('🔧 Accordion - handleAddResource llamado');
    onAddResource();
  };

  const handleProyectoClick = (proyecto: Proyecto) => {
    // Si hay un callback personalizado, usarlo (para ventana flotante)
    if (onProyectoClick) {
      onProyectoClick(proyecto);
    } else {
      // Si no, usar el modal interno
      setSelectedProyecto(proyecto);
      setShowProyectoDetails(true);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'En desarrollo':
        return 'bg-blue-100 text-blue-800';
      case 'En revisión':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="w-full bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg pointer-events-auto">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          const isExpanded = isActive;

          return (
            <div key={section.id} className="border-b border-white/10 last:border-b-0">
              {/* Header */}
              <div className={`w-full px-4 py-4 flex items-center justify-between transition-all duration-300 hover:bg-white/5 ${
                isActive ? section.color : 'bg-transparent'
              }`}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center space-x-3 flex-1"
                >
                  <Icon
                    size={20}
                    className={`transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-white/70'
                    }`}
                  />
                  <span className={`font-medium transition-colors duration-300 ${
                    isActive ? 'text-white' : 'text-white/90'
                  }`}>
                    {section.title}
                  </span>
                </button>
                <div className="flex items-center space-x-2">
                  {section.id === 'recursos' && (
                    <button
                      onClick={handleAddResource}
                      className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 opacity-80 hover:opacity-100"
                    >
                      <Plus size={14} className="text-white" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="p-1"
                  >
                    <ChevronDown
                      size={16}
                      className={`transition-all duration-300 ${
                        isActive ? 'text-white rotate-180' : 'text-white/70'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expandable Content */}
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
                <div className="bg-white/5 backdrop-blur-sm px-4 py-3">
                  {section.content === 'users' ? (
                    // Sección especial para usuarios
                    <div>
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {currentUsers.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer"
                            draggable
                            onClick={() => {
                              if (onUserClick) {
                                onUserClick({
                                  userId: user.userAuth,
                                  name: user.name,
                                  avatar: user.avatar,
                                  color: user.color,
                                  online: user.online
                                });
                              }
                            }}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', `Usuario: ${user.name}`);
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                type: 'usuario',
                                userId: user.userAuth,
                                name: user.name,
                                avatar: user.avatar,
                                color: user.color,
                                online: user.online
                              }));
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                          >
                            <div className="relative" title={user.name}>
                              {/* Marco de color */}
                              <div
                                className="w-12 h-12 rounded-full border-2 flex items-center justify-center"
                                style={{ borderColor: typeof user.color === 'string' && user.color.startsWith('#') ? user.color : undefined }}
                              >
                                {/* Avatar interno */}
                                <div className={`w-10 h-10 rounded-full ${typeof user.color === 'string' && user.color.startsWith('#') ? 'bg-gray-500' : user.color} flex items-center justify-center text-white text-sm font-semibold overflow-hidden`}>
                                  {user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? (
                                    <img
                                      src={user.avatar}
                                      alt={user.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        if (target.nextSibling) {
                                          (target.nextSibling as HTMLElement).style.display = 'flex';
                                        }
                                      }}
                                    />
                                  ) : null}
                                  <span
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ display: (user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://'))) ? 'none' : 'flex' }}
                                  >
                                    {user.avatar && !(user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? user.avatar : getAvatarFromName(user.name)}
                                  </span>
                                </div>
                              </div>
                              {user.online && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white/20"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0" title={user.name}>
                              <p className="text-sm font-medium text-white truncate">
                                {user.name}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Paginación horizontal por números */}
                      {totalUserPages > 1 && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setCurrentUserPage(prev => Math.max(1, prev - 1))}
                            disabled={currentUserPage === 1}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-lg text-sm text-white/80 hover:text-white transition-colors duration-200 font-medium disabled:text-white/40"
                          >
                            ←
                          </button>

                          {Array.from({ length: totalUserPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentUserPage(page)}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                currentUserPage === page
                                  ? 'bg-green-500 text-white'
                                  : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            onClick={() => setCurrentUserPage(prev => Math.min(totalUserPages, prev + 1))}
                            disabled={currentUserPage === totalUserPages}
                            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded-lg text-sm text-white/80 hover:text-white transition-colors duration-200 font-medium disabled:text-white/40"
                          >
                            →
                          </button>
                        </div>
                      )}
                    </div>
                  ) : section.content === 'projects' ? (
                    // Sección especial para proyectos
                    <div>
                      <div className="flex gap-2">
                        {/* Lista de proyectos */}
                        <div className="flex-1 space-y-3">
                          {currentProyectos.map((proyecto) => (
                            <div
                              key={proyecto.id}
                              className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 cursor-grab active:cursor-grabbing flex items-center gap-3"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', `Proyecto: ${proyecto.nombre}`);
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  dragType: 'proyecto',
                                  id: proyecto.id,
                                  nombre: proyecto.nombre,
                                  descripcion: proyecto.descripcion,
                                  icono: proyecto.icono
                                }));
                                e.currentTarget.style.opacity = '0.5';
                              }}
                              onDragEnd={(e) => {
                                e.currentTarget.style.opacity = '1';
                              }}
                              onClick={(e) => {
                                // Solo abrir detalles si no se está arrastrando
                                if (!e.defaultPrevented) {
                                  handleProyectoClick(proyecto);
                                }
                              }}
                            >
                              {/* Logo del proyecto */}
                              <div className="w-12 h-12 flex-shrink-0 bg-white/10 rounded-lg overflow-hidden flex items-center justify-center">
                                {proyecto.icono && proyecto.icono.startsWith('http') ? (
                                  <img
                                    src={proyecto.icono}
                                    alt={proyecto.nombre}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      const parent = e.currentTarget.parentElement;
                                      if (parent) {
                                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-2xl">📁</div>';
                                      }
                                    }}
                                  />
                                ) : proyecto.icono && !proyecto.icono.startsWith('http') ? (
                                  <span className="text-2xl">{proyecto.icono}</span>
                                ) : (
                                  <span className="text-2xl">✏️</span>
                                )}
                              </div>

                              {/* Nombre y estado */}
                              <div className="flex-1 min-w-0">
                                <h4
                                  className="text-white font-medium text-sm truncate"
                                  title={proyecto.nombre}
                                >
                                  {proyecto.nombre && proyecto.nombre.length > 14
                                    ? proyecto.nombre.substring(0, 14) + '...'
                                    : (proyecto.nombre || 'Sin nombre')}
                                </h4>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getEstadoColor(getEstadoFromType(null))}`}>
                                  {getEstadoFromType(null)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Paginación vertical */}
                        {totalProyectoPages > 1 && (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => setCurrentProyectoPage(prev => Math.max(1, prev - 1))}
                              disabled={currentProyectoPage === 1}
                              className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                            >
                              <ChevronUp size={14} className="text-white" />
                            </button>
                            <button
                              onClick={() => setCurrentProyectoPage(prev => Math.min(totalProyectoPages, prev + 1))}
                              disabled={currentProyectoPage === totalProyectoPages}
                              className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                            >
                              <ChevronDown size={14} className="text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : section.content === 'resources' ? (
                    // Sección especial para recursos con cajitas pequeñas
                    <div>
                      {recursos.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-white/60 text-sm mb-4">No hay recursos disponibles</p>
                          <button
                            onClick={handleAddResource}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors duration-200"
                          >
                            Agregar primer recurso
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-5 gap-2 mb-8 pb-4">
                          {recursos.map((recurso) => {
                            const IconComponent = recurso.icon;
                            return (
                              <div
                                key={recurso.id}
                                className="relative bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all duration-200 cursor-grab hover:scale-105 flex flex-col items-center"
                                draggable
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoveredRecurso({
                                    name: recurso.name,
                                    url: recurso.url,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top - 10
                                  });
                                }}
                                onMouseLeave={() => {
                                  setHoveredRecurso(null);
                                }}
                                onDragStart={(e) => {
                                  setIsDragging(true);
                                  setHoveredRecurso(null);
                                  e.dataTransfer.setData('text/plain', `Recurso: ${recurso.name} (${recurso.type})`);
                                  e.dataTransfer.setData('application/json', JSON.stringify({
                                    type: 'resource',
                                    name: recurso.name,
                                    resourceType: recurso.type,
                                    color: recurso.color,
                                    icon: recurso.icon.name,
                                    url: recurso.url
                                  }));

                                  // Crear imagen de drag personalizada
                                  if (dragImageRef.current) {
                                    e.dataTransfer.setDragImage(dragImageRef.current, 20, 20);
                                  }

                                  // Hacer el elemento semi-transparente durante el drag
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onDragEnd={(e) => {
                                  setIsDragging(false);
                                  e.currentTarget.style.opacity = '1';
                                }}
                                onClick={() => {
                                  // Si tiene URL, abrir en nueva pestaña
                                  if (recurso.url) {
                                    window.open(recurso.url, '_blank');
                                  }
                                }}
                              >
                                <div className={`w-8 h-8 rounded ${recurso.color} flex items-center justify-center mb-1`}>
                                  <IconComponent size={16} className="text-white" />
                                </div>
                                <span className="text-white text-[10px] text-center truncate w-full leading-tight">
                                  {recurso.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Contenido normal para otras secciones
                    <ul className="space-y-2">
                      {Array.isArray(section.content) && section.content.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="text-sm text-white/80 hover:text-white transition-colors duration-200 cursor-pointer flex items-center space-x-2 py-1 hover:bg-white/10 rounded px-2 -mx-2"
                        >
                          <div className={`w-2 h-2 rounded-full ${section.color.replace('bg-', 'bg-')} opacity-60`}></div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Imagen de drag personalizada (invisible) */}
        <div
          ref={dragImageRef}
          className="fixed -top-96 -left-96 w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold pointer-events-none z-[9999]"
          style={{ opacity: isDragging ? 1 : 0 }}
        >
          📦
        </div>
      </div>

      {/* Ventana de detalles del proyecto */}
      <Ventana
        isOpen={showProyectoDetails}
        onClose={() => setShowProyectoDetails(false)}
        title="Detalles del Proyecto"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        {selectedProyecto && (
          <div className="text-black space-y-6 p-4">
            {/* Nombre del proyecto */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Nombre del Proyecto</h3>
              <p className="text-gray-700 text-xl font-medium">{selectedProyecto.nombre}</p>
            </div>

            {/* Fecha de creación */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha de Creación</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700">
                  {new Date(selectedProyecto.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700">{selectedProyecto.description || 'Sin descripción'}</p>
              </div>
            </div>

            {/* Estado */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Estado</h3>
              <span className={`inline-block px-3 py-2 rounded-lg font-medium ${getEstadoColor(getEstadoFromType(selectedProyecto.type))}`}>
                {getEstadoFromType(selectedProyecto.type)}
              </span>
            </div>

            {/* Colores */}
            {selectedProyecto.colors && selectedProyecto.colors.length >= 3 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Colores del Proyecto</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                      style={{ backgroundColor: selectedProyecto.colors[0] || '#3B82F6' }}
                    ></div>
                    <p className="text-sm text-gray-600">Primario</p>
                    <p className="text-xs text-gray-500 font-mono">{selectedProyecto.colors[0] || '#3B82F6'}</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                      style={{ backgroundColor: selectedProyecto.colors[1] || '#1E40AF' }}
                    ></div>
                    <p className="text-sm text-gray-600">Secundario</p>
                    <p className="text-xs text-gray-500 font-mono">{selectedProyecto.colors[1] || '#1E40AF'}</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                      style={{ backgroundColor: selectedProyecto.colors[2] || '#60A5FA' }}
                    ></div>
                    <p className="text-sm text-gray-600">Acento</p>
                    <p className="text-xs text-gray-500 font-mono">{selectedProyecto.colors[2] || '#60A5FA'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Ventana>

      {/* Tooltip flotante con portal - renderizado en body para z-index máximo */}
      {typeof document !== 'undefined' && hoveredRecurso && createPortal(
        <div
          className="fixed bg-black/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg shadow-2xl border border-white/20 pointer-events-none whitespace-nowrap transition-opacity duration-200"
          style={{
            left: `${hoveredRecurso.x}px`,
            top: `${hoveredRecurso.y}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999
          }}
        >
          {hoveredRecurso.name}
          {hoveredRecurso.url && <div className="text-xs text-white/70 mt-1">Click para abrir</div>}
        </div>,
        document.body
      )}
    </>
  );
};

export default Accordion;
