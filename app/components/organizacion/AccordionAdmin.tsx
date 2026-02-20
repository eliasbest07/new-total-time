'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Archive,
  Clock,
  Target,
  LucideIcon,
  MessageCircle,
  Plus
} from 'lucide-react';
import { Recurso } from '@/domain/entities/Recurso';
import { Usuario } from '@/domain/entities/Usuario';
import { Actividad } from '@/domain/entities/Actividad';
import { Mision } from '@/domain/entities/Mision';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/infrastructure/services/SupabaseClient';

// Tipos/Interfaces
interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  content: string;
}

// Props interface
interface AccordionAdminProps {
  recursos?: Recurso[];
  actividades?: Actividad[];
  misiones?: Mision[];
  usuarios?: Usuario[];
  onAddResource?: () => void;
  onUserClick?: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
  onMisionClick?: (mision: Mision) => void;
  onActividadClick?: (actividad: Actividad) => void;
  onRecursoClick?: (recurso: Recurso) => void;
  defaultCollapsed?: boolean;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

// Función helper para convertir icono a emoji
const getIconEmoji = (icono: string | null): string => {
  if (!icono) return '📄';

  const iconMap: { [key: string]: string } = {
    'icon_doc': '📄',
    'icon_sheet': '📊',
    'icon_slide': '📽️',
    'icon_pdf': '📕',
    'icon_link': '🔗',
    'icon_folder': '📁',
    'icon_image': '🖼️',
    'icon_video': '🎥',
    'icon_youtube': '▶️',
    'icon_code': '💻',
    'icon_note': '📝'
  };

  // Si el icono ya es un emoji, devolverlo tal cual
  if (!icono.startsWith('icon_')) {
    return icono;
  }

  return iconMap[icono] || '📄';
};

// Componente Principal
const AccordionAdmin: React.FC<AccordionAdminProps> = ({
  recursos = [],
  actividades = [],
  misiones = [],
  usuarios = [],
  onAddResource,
  onUserClick,
  onMisionClick,
  onActividadClick,
  onRecursoClick,
  defaultCollapsed = false,
  onCollapseChange
}) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(defaultCollapsed);
  const [hoveredRecurso, setHoveredRecurso] = useState<{ name: string; url?: string; x: number; y: number } | null>(null);
  const [hoveredIcon, setHoveredIcon] = useState<{ title: string; x: number; y: number } | null>(null);
  const [tooltipsEnabled, setTooltipsEnabled] = useState<boolean>(false);


  // Notificar al padre cuando cambia el estado de colapso
  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    setHoveredIcon(null);
    setTooltipsEnabled(false); // Deshabilitar tooltips inmediatamente
    onCollapseChange?.(collapsed);

    // Habilitar tooltips 1000ms después de colapsar
    if (collapsed) {
      setTimeout(() => {
        setTooltipsEnabled(true);
      }, 1000);
    }
  };

  // Estados de paginación
  const [currentMisionPage, setCurrentMisionPage] = useState<number>(1);
  const [currentActividadPage, setCurrentActividadPage] = useState<number>(1);
  const [currentUserPage, setCurrentUserPage] = useState<number>(1);

  // Constantes de paginación
  const MISIONES_PER_PAGE = 2;
  const ACTIVIDADES_PER_PAGE = 2;
  const USERS_PER_PAGE = 4;

  // Estado para misiones activas (desde misiones_activas)
  const [misionesActivas, setMisionesActivas] = useState<Record<number, { estado: string; isRunning: boolean }>>({});

  // Estado para errores de carga de imagen de usuarios
  const [userImageErrors, setUserImageErrors] = useState<Record<string, boolean>>({});

  // Cargar y escuchar estado de misiones activas
  useEffect(() => {
    if (misiones.length === 0) return;

    const loadMisionesActivas = async () => {
      console.log('[ACCORDIONADMIN] Cargando misiones activas para IDs:', misiones.map(m => m.id));

      const { data, error } = await supabase
        .from('misiones_activas')
        .select('id_referencia, estado, is_running')
        .eq('tipo', 'mision')
        .in('id_referencia', misiones.map(m => m.id));

      if (error) {
        console.error('[ACCORDIONADMIN] Error cargando misiones activas:', error);
        return;
      }

      console.log('[ACCORDIONADMIN] Datos RAW de misiones_activas:', data);

      const estadoMisiones: Record<number, { estado: string; isRunning: boolean }> = {};
      const debugInfo: string[] = [];

      data?.forEach(ma => {
        const info = `ID:${ma.id_referencia} estado:"${ma.estado}" is_running:${ma.is_running}`;
        console.log(`[ACCORDIONADMIN] ${info}`);
        debugInfo.push(info);
        estadoMisiones[ma.id_referencia] = {
          estado: ma.estado || 'pendiente',
          isRunning: ma.is_running || false
        };
      });

      setMisionesActivas(estadoMisiones);

      // Log resumen
      const runningCount = Object.values(estadoMisiones).filter(m => m.isRunning).length;
      console.log(`[ACCORDIONADMIN] RESUMEN: Misiones activas: ${data?.length || 0}, Running: ${runningCount}`);
      console.log('[ACCORDIONADMIN] Misiones activas procesadas:', estadoMisiones);
    };

    loadMisionesActivas();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel('accordion-misiones-activas')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'misiones_activas',
          filter: 'tipo=eq.mision'
        },
        (payload) => {
          console.log('[ACCORDIONADMIN] Realtime cambio en misiones_activas:', payload);
          const updatedMision = payload.new as any;
          if (!updatedMision) return;

          const idReferencia = updatedMision.id_referencia;
          if (misiones.some(m => m.id === idReferencia)) {
            console.log(`[ACCORDIONADMIN] Realtime: ID:${idReferencia} is_running:${updatedMision.is_running} estado:${updatedMision.estado}`);
            setMisionesActivas(prev => ({
              ...prev,
              [idReferencia]: {
                estado: updatedMision.estado || 'pendiente',
                isRunning: updatedMision.is_running || false
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [misiones]);

  // Obtener el estado de presencia desde AuthContext
  const { isUserOnline: checkUserOnline } = useAuth();

  // Función para convertir usuarios de Supabase al formato del Accordion
  const convertirUsuariosSupabase = () => {
    return usuarios.map((usuario, index) => {
      // IMPORTANTE: Usar userAuth (UUID de Supabase) para verificar presencia
      const online = checkUserOnline(usuario.userAuth);

      return {
        id: parseInt(usuario.id) || index,
        userAuth: usuario.userAuth, // UUID para Supabase
        name: usuario.getNombreCompleto(),
        status: online ? 'En línea' : getStatusFromActivity(usuario.ultimaActividad),
        avatar: usuario.profile.avatar || getAvatarFromName(usuario.getNombreCompleto()),
        color: usuario.profile.marco || getColorForUser(index),
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

  // Paginación de usuarios
  const totalUserPages = Math.ceil(allUsers.length / USERS_PER_PAGE);
  const startUserIndex = (currentUserPage - 1) * USERS_PER_PAGE;
  const endUserIndex = startUserIndex + USERS_PER_PAGE;
  const currentUsers = allUsers.slice(startUserIndex, endUserIndex);

  // Paginación de misiones
  const totalMisionPages = Math.ceil(misiones.length / MISIONES_PER_PAGE);
  const startMisionIndex = (currentMisionPage - 1) * MISIONES_PER_PAGE;
  const endMisionIndex = startMisionIndex + MISIONES_PER_PAGE;
  const currentMisiones = misiones.slice(startMisionIndex, endMisionIndex);

  // Paginación de actividades
  const totalActividadPages = Math.ceil(actividades.length / ACTIVIDADES_PER_PAGE);
  const startActividadIndex = (currentActividadPage - 1) * ACTIVIDADES_PER_PAGE;
  const endActividadIndex = startActividadIndex + ACTIVIDADES_PER_PAGE;
  const currentActividades = actividades.slice(startActividadIndex, endActividadIndex);

  const sections: Section[] = [
    {
      id: 'misiones',
      title: 'Tickets',
      icon: Target,
      color: 'bg-orange-500',
      content: 'misiones'
    },
    {
      id: 'actividades',
      title: 'Actividades',
      icon: Clock,
      color: 'bg-blue-500',
      content: 'actividades'
    },
    {
      id: 'usuarios',
      title: 'Chat',
      icon: MessageCircle,
      color: 'bg-green-500',
      content: 'usuarios'
    },
    {
      id: 'recursos',
      title: 'Recursos',
      icon: Archive,
      color: 'bg-red-500',
      content: 'recursos'
    }
  ];

  const toggleSection = (sectionId: string): void => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
  };

  const handleAddResource = (): void => {
    if (onAddResource) {
      onAddResource();
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado?.toLowerCase()) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en progreso':
      case 'en_progreso':
        return 'bg-blue-100 text-blue-800';
      case 'completado':
      case 'completada':
        return 'bg-green-100 text-green-800';
      case 'entregada':
        return 'bg-purple-100 text-purple-800';
      case 'revisada':
      case 'aprobada':
        return 'bg-indigo-100 text-indigo-800';
      case 'pausada':
        return 'bg-yellow-100 text-yellow-800';
      case 'rechazada':
        return 'bg-red-100 text-red-800';
      case 'cancelado':
      case 'cancelada':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEstado = (estado: string | null) => {
    if (!estado) return '';
    // Mapear 'aprobada' a 'Revisada'
    if (estado.toLowerCase() === 'aprobada') return 'Revisada';
    // Mapear 'pendiente' a 'Pausada'
    if (estado.toLowerCase() === 'pendiente') return 'Pausada';
    // Reemplazar guiones bajos con espacios y capitalizar primera letra
    return estado
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Función para expandir desde modo colapsado
  const handleExpandFromCollapsed = (sectionId: string) => {
    handleCollapse(false);
    setActiveSection(sectionId);
  };

  return (
    <>
      <div
        className={`
          pointer-events-auto transition-all duration-300 ease-in-out
          ${isCollapsed
            ? 'w-auto'
            : 'w-full'
          }
        `}
      >
        {/* Vista Colapsada - Iconos horizontales (navbar) */}
        <div
          className={`
            flex flex-row items-center gap-2
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isCollapsed
              ? 'opacity-100 translate-x-0 translate-y-0 scale-100'
              : 'opacity-0 -translate-x-4 translate-y-8 scale-90 h-0 w-0 absolute pointer-events-none'
            }
          `}
          style={{ transformOrigin: 'bottom left' }}
        >
          {/* Contenedor de iconos */}
          <div
            className={`
              bg-[#001f3f] rounded-xl shadow-2xl p-1.5 flex flex-row items-center gap-1
              transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${isCollapsed ? 'scale-100' : 'scale-75'}
            `}
          >
            {sections.map((section, index) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => handleExpandFromCollapsed(section.id)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredIcon({
                      title: section.title,
                      x: rect.left + rect.width / 2,
                      y: rect.bottom + 8
                    });
                  }}
                  onMouseLeave={() => setHoveredIcon(null)}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    hover:scale-110 hover:shadow-lg
                    ${section.color}
                  `}
                  style={{
                    animation: isCollapsed ? `iconPopIn 0.4s ease-out ${index * 60}ms both` : 'none'
                  }}
                >
                  <Icon size={16} className="text-white" />
                </button>
              );
            })}
          </div>

          {/* Botón para expandir - FUERA del contenedor */}
          <button
            onClick={() => handleCollapse(false)}
            className={`
              p-2 bg-[#001f3f] hover:bg-[#003366] rounded-xl shadow-2xl
              transition-all duration-300 ease-out group
              ${isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
            `}
            style={{ transitionDelay: isCollapsed ? '200ms' : '0ms' }}
            title="Expandir panel"
          >
            <ChevronRight size={16} className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Vista Expandida - Accordion completo */}
        <div
          className={`
            flex flex-row items-start gap-2
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${!isCollapsed
              ? 'opacity-100 translate-x-0 translate-y-0 scale-100'
              : 'opacity-0 translate-x-4 -translate-y-8 scale-90 w-0 h-0 absolute pointer-events-none'
            }
          `}
          style={{ transformOrigin: 'top right' }}
        >
          {/* Botón para colapsar - FUERA del contenedor */}
          <button
            onClick={() => {
              handleCollapse(true);
              setActiveSection(null);
            }}
            className={`
              p-2 bg-[#001f3f] hover:bg-[#003366] rounded-xl shadow-2xl
              transition-all duration-300 ease-out group mt-2
              ${!isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
            `}
            style={{ transitionDelay: !isCollapsed ? '200ms' : '0ms' }}
            title="Minimizar panel"
          >
            <ChevronLeft size={16} className="text-white/60 group-hover:text-white group-hover:-translate-x-0.5 transition-all" />
          </button>

          {/* Contenedor del Accordion */}
          <div className="bg-[#001f3f] rounded-lg shadow-lg overflow-hidden flex-1">
            {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const isExpanded = isActive;

            return (
              <div key={section.id} className="border-b border-white/20 last:border-b-0">
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
                    {/* Botón + para agregar recursos */}
                    {section.id === 'recursos' && onAddResource && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddResource();
                        }}
                        className="p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200"
                        title="Agregar recurso"
                      >
                        <Plus
                          size={14}
                          className="text-white"
                        />
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
                <div className="bg-[#002b56] px-4 py-3 overflow-y-auto max-h-[600px]">
                  {section.content === 'misiones' ? (
                    // Sección de Misiones
                    <div>
                      {misiones.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-white/60 text-sm">No hay tickets disponibles</p>
                        </div>
                      ) : (
                        <div>
                          <div className="space-y-1.5 mb-2">
                            {currentMisiones.map((mision, idx) => {
                              const estadoActivo = misionesActivas[mision.id];
                              // isRunning indica si la misión está siendo trabajada activamente (timer corriendo)
                              const isEnProgreso = estadoActivo?.isRunning === true;
                              // Siempre usar mision.estado (tabla misiones) como fuente principal
                              // Solo mostrar "en_progreso" si isRunning está activo
                              const estadoFinal = isEnProgreso ? 'en_progreso' : mision.estado;

                              // DEBUG: Log para cada misión
                              console.log(`[ACCORDIONADMIN] Mision[${idx}] ID:${mision.id} "${mision.nombre}" | estado:"${mision.estado}" | isRunning:${estadoActivo?.isRunning} | isEnProgreso:${isEnProgreso}`);

                              return (
                              <div
                                key={mision.id}
                                draggable
                                title={mision.nombre || 'Sin nombre'}
                                className={`p-2 rounded-md transition-colors duration-200 cursor-grab active:cursor-grabbing select-none ${
                                  isEnProgreso
                                    ? 'bg-green-500/30 hover:bg-green-500/40 border border-green-400/50'
                                    : 'bg-white/10 hover:bg-white/20'
                                }`}
                                onClick={() => {
                                  console.log(`[ACCORDIONADMIN] CLICK en mision ID:${mision.id} estado:"${mision.estado}" isRunning:${estadoActivo?.isRunning}`);
                                  if (onMisionClick) {
                                    onMisionClick(mision);
                                  }
                                }}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', `Misión: ${mision.nombre}`);
                                  e.dataTransfer.setData('application/json', JSON.stringify({
                                    type: 'mision-organizacion',
                                    id_mision: mision.id,
                                    title: mision.nombre,
                                    description: mision.descripcion,
                                    hours: mision.horas,
                                    estado: estadoFinal || mision.estado || 'pendiente',
                                    fecha_start: mision.fecha_start,
                                    fecha_end: mision.fecha_end,
                                    id_usuario: mision.id_usuario,
                                    id_creador: mision.id_creador
                                  }));
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onDragEnd={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                              >
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    {isEnProgreso && (
                                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" title="En progreso"></span>
                                    )}
                                    <h4 className="text-xs font-medium text-white truncate">
                                      {mision.nombre || 'Sin nombre'}
                                    </h4>
                                  </div>
                                  {mision.horas && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                      isEnProgreso
                                        ? 'bg-green-200 text-green-800'
                                        : 'bg-orange-100 text-orange-700'
                                    }`}>
                                      {mision.horas}h
                                    </span>
                                  )}
                                </div>
                                {mision.descripcion && (
                                  <p className="text-[10px] text-white/60 line-clamp-1 mb-1">
                                    {mision.descripcion}
                                  </p>
                                )}
                                <div className="flex items-center justify-between gap-2">
                                  {estadoFinal && (
                                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${getEstadoColor(estadoFinal)}`}>
                                      {formatEstado(estadoFinal)}
                                    </span>
                                  )}
                                  <div className="flex gap-2 text-[10px] text-white/50">
                                    {mision.fecha_end && (
                                      <span>🏁 {new Date(mision.fecha_end).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>

                          {/* Paginación horizontal para misiones */}
                          {totalMisionPages > 1 && (
                            <div className="flex justify-center gap-1 pt-2">
                              <button
                                onClick={() => setCurrentMisionPage(prev => Math.max(1, prev - 1))}
                                disabled={currentMisionPage === 1}
                                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                              >
                                <ChevronLeft size={14} className="text-white" />
                              </button>
                              <span className="px-2 py-1 text-xs text-white/80">
                                {currentMisionPage} / {totalMisionPages}
                              </span>
                              <button
                                onClick={() => setCurrentMisionPage(prev => Math.min(totalMisionPages, prev + 1))}
                                disabled={currentMisionPage === totalMisionPages}
                                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                              >
                                <ChevronRight size={14} className="text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : section.content === 'actividades' ? (
                    // Sección de Actividades
                    <div>
                      {actividades.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-white/60 text-sm">No hay actividades disponibles</p>
                        </div>
                      ) : (
                        <div>
                          <div className="space-y-3 mb-3">
                            {currentActividades.map((actividad) => (
                              <div
                                key={actividad.id}
                                draggable
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors duration-200 cursor-grab active:cursor-grabbing select-none"
                                onClick={() => {
                                  if (onActividadClick) {
                                    onActividadClick(actividad);
                                  }
                                }}
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('text/plain', `Actividad: ${actividad.descripcion}`);
                                  e.dataTransfer.setData('application/json', JSON.stringify({
                                    type: 'actividad-organizacion',
                                    id_actividad: actividad.id,
                                    descripcion: actividad.descripcion,
                                    fecha: actividad.fecha,
                                    hora_inicio: actividad.hora_inicio,
                                    cant_horas: actividad.cant_horas,
                                    link: actividad.link,
                                    id_usuario: actividad.id_usuario,
                                    id_proyecto: actividad.id_proyecto,
                                    tiempo_dedicado: actividad.tiempo_dedicado
                                  }));
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                                onDragEnd={(e) => {
                                  e.currentTarget.style.opacity = '1';
                                }}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <p className="text-sm text-white font-medium">
                                    {actividad.descripcion || 'Sin descripción'}
                                  </p>
                                  {actividad.cant_horas && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium ml-2">
                                      {actividad.cant_horas}h
                                    </span>
                                  )}
                                </div>
                                {actividad.fecha && (
                                  <div className="text-xs text-white/60">
                                    📅 {new Date(actividad.fecha).toLocaleDateString('es-ES')}
                                  </div>
                                )}
                                {actividad.tiempo_dedicado && (
                                  <div className="text-xs text-white/60 mt-1">
                                    ⏱️ Tiempo dedicado: {Math.round(actividad.tiempo_dedicado)} min
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Paginación horizontal para actividades */}
                          {totalActividadPages > 1 && (
                            <div className="flex justify-center gap-1 pt-2">
                              <button
                                onClick={() => setCurrentActividadPage(prev => Math.max(1, prev - 1))}
                                disabled={currentActividadPage === 1}
                                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                              >
                                <ChevronLeft size={14} className="text-white" />
                              </button>
                              <span className="px-2 py-1 text-xs text-white/80">
                                {currentActividadPage} / {totalActividadPages}
                              </span>
                              <button
                                onClick={() => setCurrentActividadPage(prev => Math.min(totalActividadPages, prev + 1))}
                                disabled={currentActividadPage === totalActividadPages}
                                className="p-1 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed rounded transition-colors duration-200 disabled:opacity-40"
                              >
                                <ChevronRight size={14} className="text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : section.content === 'usuarios' ? (
                    // Sección de Usuarios para Chatear
                    <div>
                      {allUsers.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-white/60 text-sm">No hay usuarios disponibles</p>
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {currentUsers.map((user) => (
                              <div
                                key={user.id}
                                draggable
                                className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-grab active:cursor-grabbing select-none"
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
                                      {user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) && !userImageErrors[user.userAuth] ? (
                                        <img
                                          src={user.avatar}
                                          alt={user.name}
                                          className="w-full h-full object-cover"
                                          onError={() => {
                                            setUserImageErrors(prev => ({ ...prev, [user.userAuth]: true }));
                                          }}
                                        />
                                      ) : (
                                        <span className="w-full h-full flex items-center justify-center text-2xl">
                                          {user.avatar && !(user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? user.avatar : '👤'}
                                        </span>
                                      )}
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
                                  <p className="text-xs text-white/60 truncate">
                                    {user.status}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Paginación horizontal por números para usuarios */}
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
                      )}
                    </div>
                  ) : section.content === 'recursos' ? (
                    // Sección de Recursos
                    <div>
                      {recursos.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-white/60 text-sm mb-4">No hay recursos disponibles</p>
                          {onAddResource && (
                            <button
                              onClick={handleAddResource}
                              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors duration-200"
                            >
                              Agregar primer recurso
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {recursos.map((recurso) => {
                              return (
                                <div
                                  key={recurso.id}
                                  draggable
                                  className="relative bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 flex flex-col items-center select-none"
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredRecurso({
                                      name: recurso.nombre || 'Recurso',
                                      url: recurso.link || undefined,
                                      x: rect.left + rect.width / 2,
                                      y: rect.top - 10
                                    });
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredRecurso(null);
                                  }}
                                  onDragStart={(e) => {
                                    setHoveredRecurso(null);
                                    e.dataTransfer.setData('text/plain', `Recurso: ${recurso.nombre}`);
                                    e.dataTransfer.setData('application/json', JSON.stringify({
                                      type: 'recurso',
                                      id: recurso.id,
                                      name: recurso.nombre,
                                      resourceType: 'document',
                                      url: recurso.link,
                                      icon: recurso.icono,
                                      color: 'bg-blue-500'
                                    }));
                                    e.currentTarget.style.opacity = '0.5';
                                  }}
                                  onDragEnd={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                  }}
                                  onClick={() => {
                                    if (onRecursoClick) {
                                      onRecursoClick(recurso);
                                    }
                                  }}
                                >
                                  <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center mb-1">
                                    <span className="text-lg">{getIconEmoji(recurso.icono)}</span>
                                  </div>
                                  <span className="text-white text-[10px] text-center truncate w-full leading-tight">
                                    {recurso.nombre || 'Recurso'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Botón para agregar más recursos */}
                          {onAddResource && (
                            <button
                              onClick={handleAddResource}
                              className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1"
                            >
                              <Plus size={14} />
                              Agregar recurso
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </div>

      {/* Tooltip flotante para iconos en modo colapsado */}
      {hoveredIcon && isCollapsed && tooltipsEnabled && (
        <div
          className="fixed bg-black/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg shadow-2xl border border-white/20 pointer-events-none whitespace-nowrap"
          style={{
            left: `${hoveredIcon.x}px`,
            top: `${hoveredIcon.y}px`,
            transform: 'translateX(-50%)',
            zIndex: 99999
          }}
        >
          {hoveredIcon.title}
        </div>
      )}

      {/* Tooltip flotante para recursos */}
      {hoveredRecurso && (
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
        </div>
      )}


      {/* Estilos de animación */}
      <style jsx>{`
        @keyframes iconPopIn {
          0% {
            opacity: 0;
            transform: scale(0.5) translateY(10px);
          }
          60% {
            opacity: 1;
            transform: scale(1.1) translateY(-2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes accordionExpand {
          0% {
            opacity: 0;
            transform: scaleY(0) scaleX(0.8);
          }
          100% {
            opacity: 1;
            transform: scaleY(1) scaleX(1);
          }
        }

        @keyframes accordionCollapse {
          0% {
            opacity: 1;
            transform: scaleY(1) scaleX(1);
          }
          100% {
            opacity: 0;
            transform: scaleY(0) scaleX(0.8);
          }
        }
      `}</style>
    </>
  );
};

export default AccordionAdmin;
