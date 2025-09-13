'use client';

import { useState, useRef } from 'react';
import {
  ChevronDown,
  Users,
  FolderOpen,
  Archive,
  Clock,
  FileText,
  Image,
  Video,
  Download,
  Link,
  Code,
  Plus,
  LucideIcon
} from 'lucide-react';
import { type Resource } from '../utils/resourceUtils';

// Tipos/Interfaces
interface User {
  id: number;
  name: string;
  status: string;
  avatar: string;
  color: string;
  online: boolean;
}


interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  content: string | string[];
}

interface AccordionProps {
  recursos: Resource[];
  onAddResource: () => void;
}

// Componente Principal
const Accordion: React.FC<AccordionProps> = ({ recursos, onAddResource }) => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showAllUsers, setShowAllUsers] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragImageRef = useRef<HTMLDivElement>(null);

  // Lista completa de usuarios
  const allUsers: User[] = [
    { id: 1, name: 'Juan Pérez', status: 'En línea', avatar: 'JP', color: 'bg-blue-500', online: true },
    { id: 2, name: 'María García', status: 'Activa hace 5 min', avatar: 'MG', color: 'bg-purple-500', online: false },
    { id: 3, name: 'Carlos López', status: 'En línea', avatar: 'CL', color: 'bg-orange-500', online: true },
    { id: 4, name: 'Ana Martínez', status: 'Activa hace 2 min', avatar: 'AM', color: 'bg-pink-500', online: false },
    { id: 5, name: 'Luis Rodríguez', status: 'En línea', avatar: 'LR', color: 'bg-indigo-500', online: true },
    { id: 6, name: 'Sofia Chen', status: 'En línea', avatar: 'SC', color: 'bg-teal-500', online: true },
    { id: 7, name: 'Diego Morales', status: 'Activa hace 10 min', avatar: 'DM', color: 'bg-red-500', online: false },
    { id: 8, name: 'Elena Vargas', status: 'En línea', avatar: 'EV', color: 'bg-green-600', online: true },
    { id: 9, name: 'Roberto Silva', status: 'Activa hace 1 hora', avatar: 'RS', color: 'bg-yellow-500', online: false },
    { id: 10, name: 'Carmen Ruiz', status: 'En línea', avatar: 'CR', color: 'bg-cyan-500', online: true }
  ];


  const sections: Section[] = [
    {
      id: 'usuarios',
      title: 'Usuarios conectados',
      icon: Users,
      color: 'bg-green-500',
      content: 'users'
    },
    {
      id: 'proyectos',
      title: 'Proyectos',
      icon: FolderOpen,
      color: 'bg-blue-500',
      content: [
        'Proyecto Alpha - En desarrollo',
        'Proyecto Beta - En revisión',
        'Proyecto Gamma - Completado',
        'Proyecto Delta - Planificación',
        'Proyecto Epsilon - En pausa'
      ]
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
    onAddResource();
  };

  return (
    <div className="w-full bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-lg pointer-events-auto">
      {sections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;
        const isExpanded = isActive;

        return (
          <div key={section.id} className="border-b border-white/10 last:border-b-0">
            {/* Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className={`w-full px-4 py-4 flex items-center justify-between transition-all duration-300 hover:bg-white/5 ${isActive ? section.color : 'bg-transparent'
                }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  size={20}
                  className={`transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/70'
                    }`}
                />
                <span className={`font-medium transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/90'
                  }`}>
                  {section.title}
                </span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-all duration-300 ${isActive ? 'text-white rotate-180' : 'text-white/70'
                  }`}
              />
            </button>

            {/* Expandable Content */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
              }`}>
              <div className="bg-white/5 backdrop-blur-sm px-4 py-3">
                {section.content === 'users' ? (
                  // Sección especial para usuarios
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {(showAllUsers ? allUsers : allUsers.slice(0, 4)).map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2 p-2 hover:bg-white/10 rounded-lg transition-colors duration-200 cursor-pointer"
                        >
                          <div className="relative">
                            <div className={`w-10 h-10 rounded-full ${user.color} flex items-center justify-center text-white text-sm font-semibold`}>
                              {user.avatar}
                            </div>
                            {user.online && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white/20"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user.name}</p>
                            <div className="flex items-center space-x-1">
                              {!user.online && <Clock size={10} className="text-white/60" />}
                              <p className="text-xs text-white/60 truncate">{user.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Botón Ver más */}
                    <button
                      onClick={() => setShowAllUsers(!showAllUsers)}
                      className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/80 hover:text-white transition-colors duration-200 font-medium"
                    >
                      {showAllUsers ? 'Ver menos' : `Ver más (${allUsers.length - 4} usuarios más)`}
                    </button>
                  </div>
                ) : section.content === 'resources' ? (
                  // Sección especial para recursos con cajitas pequeñas
                  <div>
                    <div className="grid grid-cols-5 gap-2 mb-8 pb-4">
                      {recursos.map((recurso) => {
                        const IconComponent = recurso.icon;
                        return (
                          <div
                            key={recurso.id}
                            className="relative bg-white/10 hover:bg-white/20 rounded-lg p-2 transition-all duration-200 cursor-grab hover:scale-105 flex flex-col items-center group"
                            draggable
                            onDragStart={(e) => {
                              setIsDragging(true);
                              e.dataTransfer.setData('text/plain', `Recurso: ${recurso.name} (${recurso.type})`);
                              e.dataTransfer.setData('application/json', JSON.stringify({
                                type: 'resource',
                                name: recurso.name,
                                resourceType: recurso.type,
                                color: recurso.color,
                                icon: recurso.icon.name
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
                          >
                            <div className={`w-8 h-8 rounded ${recurso.color} flex items-center justify-center mb-1`}>
                              <IconComponent size={16} className="text-white" />
                            </div>
                            <span className="text-white text-[10px] text-center truncate w-full leading-tight">
                              {recurso.name}
                            </span>

                            {/* Tooltip */}
                            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999] shadow-2xl border border-white/20">
                              {recurso.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botón discreto para añadir recurso */}
                    <button
                      onClick={handleAddResource}
                      className="w-full py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded border border-white/20 border-dashed text-xs text-white/60 hover:text-white/80 transition-colors duration-200 flex items-center justify-center space-x-1"
                    >
                      <Plus size={12} />
                      <span>Añadir recurso</span>
                    </button>
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
  );
};

export default Accordion;