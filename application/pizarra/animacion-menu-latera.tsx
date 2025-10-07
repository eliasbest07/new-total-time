// app/(components)/TimeManagementApp.tsx
'use client';

import React, { useState, useRef, JSX } from 'react';
import {
  Clock,
  BarChart3,
  Users,
  Bell,
  FolderOpen,
  Settings,
  Plus,
  GripVertical,
  X,
  Maximize2,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// Tipos de datos
type SidebarItem = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

type SidebarSection = {
  title: string;
  icon: JSX.Element;
  items: SidebarItem[];
};

type CanvasElementType = {
  id: string;
  type: string;
  name: string;
  icon: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

type ExpandedSections = {
  recursos: boolean;
  misiones: boolean;
  actividades: boolean;
};

type CanvasElementProps = {
  element: CanvasElementType;
  onRemove: () => void;
  onMove: (newPosition: { x: number; y: number }) => void;
};

const TimeManagementApp: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [canvasElements, setCanvasElements] = useState<CanvasElementType[]>([]);
  const [draggedItem, setDraggedItem] = useState<SidebarItem | null>(null);
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    recursos: true,
    misiones: true,
    actividades: true,
  });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Secciones del sidebar
  const sidebarSections: Record<string, SidebarSection> = {
    recursos: {
      title: 'Recursos',
      icon: <FolderOpen className="w-4 h-4" />,
      items: [
        { id: 'resource-1', name: 'Documentos', icon: '📄', color: 'bg-blue-500' },
        { id: 'resource-2', name: 'Videos', icon: '🎥', color: 'bg-red-500' },
        { id: 'resource-3', name: 'Enlaces', icon: '🔗', color: 'bg-green-500' },
        { id: 'resource-4', name: 'Imágenes', icon: '🖼️', color: 'bg-purple-500' },
      ],
    },
    misiones: {
      title: 'Misiones',
      icon: <Target className="w-4 h-4" />,
      items: [
        { id: 'mission-1', name: 'Completar proyecto', icon: '🎯', color: 'bg-orange-500' },
        { id: 'mission-2', name: 'Reunión equipo', icon: '👥', color: 'bg-cyan-500' },
        { id: 'mission-3', name: 'Revisar código', icon: '💻', color: 'bg-indigo-500' },
        { id: 'mission-4', name: 'Documentar API', icon: '📚', color: 'bg-pink-500' },
      ],
    },
    actividades: {
      title: 'Actividades',
      icon: <BarChart3 className="w-4 h-4" />,
      items: [
        { id: 'activity-1', name: 'Desarrollo', icon: '⚡', color: 'bg-yellow-500' },
        { id: 'activity-2', name: 'Testing', icon: '🧪', color: 'bg-teal-500' },
        { id: 'activity-3', name: 'Diseño', icon: '🎨', color: 'bg-rose-500' },
        { id: 'activity-4', name: 'Planificación', icon: '📅', color: 'bg-emerald-500' },
      ],
    },
  };

  const toggleSection = (section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: SidebarItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newElement: CanvasElementType = {
      id: `${draggedItem.id}-${Date.now()}`,
      type: draggedItem.id,
      name: draggedItem.name,
      icon: draggedItem.icon,
      color: draggedItem.color,
      position: { x, y },
      size: { width: 200, height: 120 },
    };

    setCanvasElements([...canvasElements, newElement]);
    setDraggedItem(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeElement = (id: string) => {
    setCanvasElements(canvasElements.filter((el) => el.id !== id));
  };

  const moveElement = (id: string, newPosition: { x: number; y: number }) => {
    setCanvasElements(
      canvasElements.map((el) => (el.id === id ? { ...el, position: newPosition } : el))
    );
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header + Navigation */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Simple Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-lg">
                TT
              </div>
              <span className="text-xl font-bold text-white">Total Time</span>
            </div>

            <div className="flex gap-4">
              <div className="bg-gray-700 rounded-lg px-4 py-2 text-center">
                <div className="text-lg font-semibold text-green-400">2:12</div>
                <div className="text-xs text-gray-400">Tarea actual</div>
              </div>
              <div className="bg-gray-700 rounded-lg px-4 py-2 text-center">
                <div className="text-lg font-semibold text-purple-400">3:12</div>
                <div className="text-xs text-gray-400">Tiempo total hoy</div>
              </div>
            </div>
          </div>

          <div className="flex bg-gray-700 rounded-lg p-1">
            <button className="py-2 px-4 rounded bg-blue-600 text-white text-sm font-medium flex items-center gap-2">
              Reglas <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded">2</span>
            </button>
            <button className="py-2 px-4 text-gray-300 hover:text-white text-sm font-medium transition-colors">
              Aviso
            </button>
            <button className="py-2 px-4 text-gray-300 hover:text-white text-sm font-medium transition-colors">
              RePolla
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col ${
            sidebarCollapsed ? 'w-16' : 'w-80'
          }`}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            {!sidebarCollapsed && <h2 className="font-semibold text-gray-200">Panel de Control</h2>}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto">
              {/* Acciones */}
              <div className="p-4 border-b border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide">Acciones</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                    <Plus className="w-4 h-4" /> Agregar nota
                  </button>
                  <button className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                    <Settings className="w-4 h-4" /> Agregar lista de tareas
                  </button>
                </div>
              </div>

              {/* Secciones Draggables */}
              {Object.entries(sidebarSections).map(([key, section]) => (
                <div key={key} className="border-b border-gray-700">
                  <button
                    onClick={() => toggleSection(key as keyof ExpandedSections)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <span className="font-medium">{section.title}</span>
                      <span className="text-xs bg-gray-600 px-2 py-1 rounded-full">{section.items.length}</span>
                    </div>
                    {expandedSections[key as keyof ExpandedSections] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {expandedSections[key as keyof ExpandedSections] && (
                    <div className="px-4 pb-4 space-y-2">
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                        >
                          <div className={`w-8 h-8 ${item.color} rounded-lg flex items-center justify-center text-sm`}>
                            {item.icon}
                          </div>
                          <span className="text-sm font-medium">{item.name}</span>
                          <GripVertical className="w-4 h-4 ml-auto text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full bg-gray-900 relative"
            onDrop={handleCanvasDrop}
            onDragOver={handleCanvasDragOver}
          >
            {/* Grid Pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '24px 24px',
              }}
            />

            {/* Drop Zone Hint */}
            {canvasElements.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Maximize2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl font-medium mb-2">Workspace Vacío</p>
                  <p className="text-sm">Arrastra recursos, misiones o actividades desde el panel lateral</p>
                </div>
              </div>
            )}

            {/* Rendered Elements */}
            {canvasElements.map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                onRemove={() => removeElement(element.id)}
                onMove={(newPosition) => moveElement(element.id, newPosition)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas Element Component
const CanvasElement: React.FC<CanvasElementProps> = ({ element, onRemove, onMove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [localPosition, setLocalPosition] = useState(element.position);
  const elementRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setLocalPosition(element.position);
  }, [element.position]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('.no-drag')) return;

    setIsDragging(true);
    const rect = elementRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !elementRef.current) return;

    const canvas = elementRef.current.parentElement;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();

    const newX = e.clientX - canvasRect.left - dragOffset.x;
    const newY = e.clientY - canvasRect.top - dragOffset.y;

    setLocalPosition({
      x: Math.max(0, newX),
      y: Math.max(0, newY),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onMove(localPosition);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, dragOffset, localPosition]);

  return (
    <div
      ref={elementRef}
      className={`absolute bg-gray-800 border-2 ${element.color.replace('bg-', 'border-')} rounded-xl shadow-lg transition-all duration-200 ${
        isDragging ? 'cursor-grabbing scale-105 shadow-2xl' : 'cursor-grab hover:shadow-xl'
      }`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-3 ${element.color} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{element.icon}</span>
          <span className="text-sm font-semibold text-white">{element.name}</span>
        </div>
        <button
          onClick={onRemove}
          className="no-drag p-1 hover:bg-black hover:bg-opacity-20 rounded text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 no-drag">
        <div className="text-gray-300 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Activo</span>
          </div>
          <div className="text-xs text-gray-400">Última actualización: hace 5 min</div>
        </div>
      </div>
    </div>
  );
};

export default TimeManagementApp;