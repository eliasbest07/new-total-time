"use client";

import { useState, useRef, useMemo } from 'react';
import Perfil from '@/app/components/mainUI/Perfil';
import RelojActual from '@/app/components/mainUI/RelojActual';
import Ventana from './components/Ventana';
import Accordion from './components/Accordion';
import AddResourceForm from './components/AddResourceForm';
import Sala from './components/Sala';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOrganizacion } from '@/hooks/useOrganizacion';
import { useProyectos } from '@/hooks/useProyectos';

import {
  FileText,
  Image,
  Video,
  Download,
  Link,
  Code,
  Archive,
  FolderOpen,
  ChevronRight,
  StickyNote,
  CheckSquare,
  Send
} from 'lucide-react';
import { saveResource, type Resource, type NewResourceData } from './utils/resourceUtils';
import ActividadesGrid from './components/ActividadesGrid';
import Cube from './components/cubo-acordion';
import { Actividad } from '@/domain/entities/Actividad';
import { Usuario } from '@/domain/entities/Usuario';
import { Rol } from '@/domain/enums/Rol';
import { Permiso } from '@/domain/enums/Permiso';
import { Proyecto } from '@/domain/entities/Proyecto';

type BoardHistoryItem = {
  id: string;
  title: string;
  type: 'Nota' | 'Tarea' | 'Recurso';
  owner: string;
  summary: string;
  lastUpdated: string;
};

type BoardHistorySnapshot = {
  id: string;
  label: string;
  value: number;
  savedAt: string;
  summary: string;
  highlights: string[];
  items: BoardHistoryItem[];
};

export default function Dashboard() {
  // Auth y datos de usuario
  const { usuario } = useAuth();
  const { organizacion, loading: loadingOrg } = useOrganizacion(usuario?.id || null);
  const { proyectos, loading: loadingProyectos } = useProyectos(organizacion?.id || null);

  // Estado de UI
  const [ventanaAbierta, setVentanaAbierta] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showActividadDetails, setShowActividadDetails] = useState(false);
  const [showMisionDetails, setShowMisionDetails] = useState(false);
  const [selectedMision, setSelectedMision] = useState<{ title: string, hours: number } | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySnapshot, setSelectedHistorySnapshot] = useState<BoardHistorySnapshot | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showButtons, setShowButtons] = useState(false);
  const pizarraRef = useRef<PizarraRef>(null);

  // Estado para filtrado de proyectos
  const [selectedProyectoId, setSelectedProyectoId] = useState<number | null>(null);

  // Usuarios mock para testing
  const mockUsuarios: Usuario[] = [
    new Usuario('1', 'juan.perez@example.com', Rol.ADMIN, { nombre: 'Juan Pérez', apellido: '', avatar: '', nivel: 5, correo: 'juan.perez@example.com', username: 'jperez', bio: '', idea: '', marco: '' }, 95, 'auth1', true, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 2 * 60000)),
    new Usuario('2', 'maria.rodriguez@example.com', Rol.MIEMBRO, { nombre: 'María Rodríguez', apellido: '', avatar: '', nivel: 3, correo: 'maria.rodriguez@example.com', username: 'mrodriguez', bio: '', idea: '', marco: '' }, 88, 'auth2', false, 'org1', [Permiso.LEER], new Date(Date.now() - 15 * 60000)),
    new Usuario('3', 'carlos.gomez@example.com', Rol.MIEMBRO, { nombre: 'Carlos Gómez', apellido: '', avatar: '', nivel: 4, correo: 'carlos.gomez@example.com', username: 'cgomez', bio: '', idea: '', marco: '' }, 92, 'auth3', false, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 45 * 60000)),
    new Usuario('4', 'ana.martinez@example.com', Rol.MIEMBRO, { nombre: 'Ana Martínez', apellido: '', avatar: '', nivel: 2, correo: 'ana.martinez@example.com', username: 'amartinez', bio: '', idea: '', marco: '' }, 76, 'auth4', false, 'org1', [Permiso.LEER], new Date(Date.now() - 3 * 60 * 60000)),
    new Usuario('5', 'luis.fernandez@example.com', Rol.ADMIN, { nombre: 'Luis Fernández', apellido: '', avatar: '', nivel: 6, correo: 'luis.fernandez@example.com', username: 'lfernandez', bio: '', idea: '', marco: '' }, 98, 'auth5', true, 'org1', [Permiso.LEER, Permiso.ESCRIBIR, Permiso.ELIMINAR], new Date(Date.now() - 1 * 60000)),
    new Usuario('6', 'sofia.lopez@example.com', Rol.MIEMBRO, { nombre: 'Sofía López', apellido: '', avatar: '', nivel: 3, correo: 'sofia.lopez@example.com', username: 'slopez', bio: '', idea: '', marco: '' }, 84, 'auth6', false, 'org1', [Permiso.LEER], new Date(Date.now() - 8 * 60 * 60000)),
    new Usuario('7', 'diego.sanchez@example.com', Rol.MIEMBRO, { nombre: 'Diego Sánchez', apellido: '', avatar: '', nivel: 4, correo: 'diego.sanchez@example.com', username: 'dsanchez', bio: '', idea: '', marco: '' }, 90, 'auth7', false, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 25 * 60000)),
    new Usuario('8', 'laura.torres@example.com', Rol.MIEMBRO, { nombre: 'Laura Torres', apellido: '', avatar: '', nivel: 5, correo: 'laura.torres@example.com', username: 'ltorres', bio: '', idea: '', marco: '' }, 87, 'auth8', false, 'org1', [Permiso.LEER], new Date(Date.now() - 2 * 24 * 60 * 60000)),
    new Usuario('9', 'pablo.ramirez@example.com', Rol.MIEMBRO, { nombre: 'Pablo Ramírez', apellido: '', avatar: '', nivel: 2, correo: 'pablo.ramirez@example.com', username: 'pramirez', bio: '', idea: '', marco: '' }, 79, 'auth9', false, 'org1', [Permiso.LEER], new Date(Date.now() - 50 * 60000)),
    new Usuario('10', 'valeria.castro@example.com', Rol.ADMIN, { nombre: 'Valeria Castro', apellido: '', avatar: '', nivel: 7, correo: 'valeria.castro@example.com', username: 'vcastro', bio: '', idea: '', marco: '' }, 96, 'auth10', true, 'org1', [Permiso.LEER, Permiso.ESCRIBIR, Permiso.ELIMINAR], new Date(Date.now() - 4 * 60000)),
    new Usuario('11', 'javier.morales@example.com', Rol.MIEMBRO, { nombre: 'Javier Morales', apellido: '', avatar: '', nivel: 3, correo: 'javier.morales@example.com', username: 'jmorales', bio: '', idea: '', marco: '' }, 82, 'auth11', false, 'org1', [Permiso.LEER], new Date(Date.now() - 6 * 60 * 60000)),
    new Usuario('12', 'camila.ruiz@example.com', Rol.MIEMBRO, { nombre: 'Camila Ruiz', apellido: '', avatar: '', nivel: 4, correo: 'camila.ruiz@example.com', username: 'cruiz', bio: '', idea: '', marco: '' }, 91, 'auth12', false, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 30 * 60000)),
    new Usuario('13', 'miguel.herrera@example.com', Rol.MIEMBRO, { nombre: 'Miguel Herrera', apellido: '', avatar: '', nivel: 5, correo: 'miguel.herrera@example.com', username: 'mherrera', bio: '', idea: '', marco: '' }, 93, 'auth13', false, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 1 * 60000)),
    new Usuario('14', 'daniela.vargas@example.com', Rol.MIEMBRO, { nombre: 'Daniela Vargas', apellido: '', avatar: '', nivel: 2, correo: 'daniela.vargas@example.com', username: 'dvargas', bio: '', idea: '', marco: '' }, 78, 'auth14', false, 'org1', [Permiso.LEER], new Date(Date.now() - 5 * 24 * 60 * 60000)),
    new Usuario('15', 'andres.silva@example.com', Rol.MIEMBRO, { nombre: 'Andrés Silva', apellido: '', avatar: '', nivel: 6, correo: 'andres.silva@example.com', username: 'asilva', bio: '', idea: '', marco: '' }, 94, 'auth15', false, 'org1', [Permiso.LEER, Permiso.ESCRIBIR], new Date(Date.now() - 20 * 60000))
  ];

  // Proyectos mock para testing
  const mockProyectos: Proyecto[] = [
    {
      id: 1,
      created_at: '2024-01-15T10:00:00Z',
      nombre: 'E-Commerce Platform',
      user_id: 'user1',
      ip_creacion: '192.168.1.1',
      pais_creacion: 'ES',
      publico: true,
      imagen_url: null,
      description: 'Plataforma de comercio electrónico con carrito de compras',
      style_prompt: 'modern, clean',
      type: 'development',
      utility: 'sales',
      palette: 'blue',
      colors: ['#3B82F6', '#1E40AF', '#60A5FA'],
      timestamp: '2024-01-15T10:00:00Z',
      producto: 'web'
    },
    {
      id: 2,
      created_at: '2024-02-20T14:30:00Z',
      nombre: 'Mobile Banking App',
      user_id: 'user2',
      ip_creacion: '192.168.1.2',
      pais_creacion: 'MX',
      publico: false,
      imagen_url: null,
      description: 'Aplicación móvil para gestión bancaria',
      style_prompt: 'professional, secure',
      type: 'active',
      utility: 'finance',
      palette: 'green',
      colors: ['#10B981', '#047857', '#34D399'],
      timestamp: '2024-02-20T14:30:00Z',
      producto: 'mobile'
    },
    {
      id: 3,
      created_at: '2024-03-10T09:15:00Z',
      nombre: 'Social Network Dashboard',
      user_id: 'user1',
      ip_creacion: '192.168.1.3',
      pais_creacion: 'AR',
      publico: true,
      imagen_url: null,
      description: 'Dashboard para análisis de redes sociales',
      style_prompt: 'vibrant, dynamic',
      type: 'review',
      utility: 'analytics',
      palette: 'purple',
      colors: ['#8B5CF6', '#6D28D9', '#A78BFA'],
      timestamp: '2024-03-10T09:15:00Z',
      producto: 'web'
    },
    {
      id: 4,
      created_at: '2024-04-05T16:45:00Z',
      nombre: 'Healthcare Portal',
      user_id: 'user3',
      ip_creacion: '192.168.1.4',
      pais_creacion: 'CO',
      publico: false,
      imagen_url: null,
      description: 'Portal de gestión para centros de salud',
      style_prompt: 'clean, medical',
      type: 'completed',
      utility: 'healthcare',
      palette: 'teal',
      colors: ['#14B8A6', '#0D9488', '#2DD4BF'],
      timestamp: '2024-04-05T16:45:00Z',
      producto: 'web'
    },
    {
      id: 5,
      created_at: '2024-05-12T11:20:00Z',
      nombre: 'Food Delivery Service',
      user_id: 'user2',
      ip_creacion: '192.168.1.5',
      pais_creacion: 'CL',
      publico: true,
      imagen_url: null,
      description: 'Servicio de entrega de comida a domicilio',
      style_prompt: 'appetizing, fast',
      type: 'development',
      utility: 'delivery',
      palette: 'orange',
      colors: ['#F59E0B', '#D97706', '#FBB040'],
      timestamp: '2024-05-12T11:20:00Z',
      producto: 'mobile'
    },
    {
      id: 6,
      created_at: '2024-06-18T13:00:00Z',
      nombre: 'Real Estate Marketplace',
      user_id: 'user1',
      ip_creacion: '192.168.1.6',
      pais_creacion: 'PE',
      publico: true,
      imagen_url: null,
      description: 'Marketplace para compra y venta de propiedades',
      style_prompt: 'elegant, trustworthy',
      type: 'active',
      utility: 'real-estate',
      palette: 'indigo',
      colors: ['#6366F1', '#4F46E5', '#818CF8'],
      timestamp: '2024-06-18T13:00:00Z',
      producto: 'web'
    },
    {
      id: 7,
      created_at: '2024-07-22T08:30:00Z',
      nombre: 'Fitness Tracker',
      user_id: 'user3',
      ip_creacion: '192.168.1.7',
      pais_creacion: 'UY',
      publico: false,
      imagen_url: null,
      description: 'App para seguimiento de ejercicios y nutrición',
      style_prompt: 'energetic, motivational',
      type: 'development',
      utility: 'fitness',
      palette: 'red',
      colors: ['#EF4444', '#DC2626', '#F87171'],
      timestamp: '2024-07-22T08:30:00Z',
      producto: 'mobile'
    },
    {
      id: 8,
      created_at: '2024-08-14T15:10:00Z',
      nombre: 'Educational Platform',
      user_id: 'user2',
      ip_creacion: '192.168.1.8',
      pais_creacion: 'EC',
      publico: true,
      imagen_url: null,
      description: 'Plataforma de cursos online y aprendizaje',
      style_prompt: 'educational, accessible',
      type: 'review',
      utility: 'education',
      palette: 'yellow',
      colors: ['#F59E0B', '#D97706', '#FBBF24'],
      timestamp: '2024-08-14T15:10:00Z',
      producto: 'web'
    },
    {
      id: 9,
      created_at: '2024-09-03T10:45:00Z',
      nombre: 'Travel Booking System',
      user_id: 'user1',
      ip_creacion: '192.168.1.9',
      pais_creacion: 'BO',
      publico: true,
      imagen_url: null,
      description: 'Sistema de reservas para hoteles y vuelos',
      style_prompt: 'wanderlust, adventurous',
      type: 'completed',
      utility: 'travel',
      palette: 'cyan',
      colors: ['#06B6D4', '#0891B2', '#22D3EE'],
      timestamp: '2024-09-03T10:45:00Z',
      producto: 'web'
    },
    {
      id: 10,
      created_at: '2024-10-20T12:00:00Z',
      nombre: 'Music Streaming App',
      user_id: 'user3',
      ip_creacion: '192.168.1.10',
      pais_creacion: 'VE',
      publico: false,
      imagen_url: null,
      description: 'App de streaming de música y podcasts',
      style_prompt: 'rhythmic, immersive',
      type: 'active',
      utility: 'entertainment',
      palette: 'pink',
      colors: ['#EC4899', '#DB2777', '#F472B6'],
      timestamp: '2024-10-20T12:00:00Z',
      producto: 'mobile'
    },
    {
      id: 11,
      created_at: '2024-11-08T09:30:00Z',
      nombre: 'Project Management Tool',
      user_id: 'user2',
      ip_creacion: '192.168.1.11',
      pais_creacion: 'CR',
      publico: true,
      imagen_url: null,
      description: 'Herramienta de gestión de proyectos y tareas',
      style_prompt: 'organized, efficient',
      type: 'development',
      utility: 'productivity',
      palette: 'slate',
      colors: ['#64748B', '#475569', '#94A3B8'],
      timestamp: '2024-11-08T09:30:00Z',
      producto: 'web'
    },
    {
      id: 12,
      created_at: '2024-12-01T14:20:00Z',
      nombre: 'Smart Home Control',
      user_id: 'user1',
      ip_creacion: '192.168.1.12',
      pais_creacion: 'PA',
      publico: false,
      imagen_url: null,
      description: 'Control centralizado de dispositivos del hogar',
      style_prompt: 'futuristic, smart',
      type: 'review',
      utility: 'iot',
      palette: 'emerald',
      colors: ['#10B981', '#059669', '#34D399'],
      timestamp: '2024-12-01T14:20:00Z',
      producto: 'mobile'
    }
  ];
  // Lista de recursos inicial
  const [recursos, setRecursos] = useState<Resource[]>([
    { id: 1, name: 'Docs', icon: FileText, color: 'bg-blue-500', type: 'DOC' },
    { id: 2, name: 'Imágenes', icon: Image, color: 'bg-green-500', type: 'IMG' },
    { id: 3, name: 'Videos', icon: Video, color: 'bg-purple-500', type: 'MP4' },
    { id: 4, name: 'Archivos', icon: Download, color: 'bg-orange-500', type: 'ZIP' },
    { id: 5, name: 'Enlaces', icon: Link, color: 'bg-cyan-500', type: 'URL' },
    { id: 6, name: 'Código', icon: Code, color: 'bg-pink-500', type: 'JS' },
    { id: 7, name: 'PDFs', icon: FileText, color: 'bg-red-500', type: 'PDF' },
    { id: 8, name: 'Audio', icon: Video, color: 'bg-yellow-500', type: 'MP3' },
    { id: 9, name: 'Plantillas', icon: FolderOpen, color: 'bg-indigo-500', type: 'TPL' },
    { id: 10, name: 'Recursos', icon: Archive, color: 'bg-teal-600', type: 'RES' }
  ]);

  const previousDayBoardHistory: BoardHistorySnapshot[] = [
    {
      id: 'notas-clave2',
      label: 'Notas',
      value: 18,
      savedAt: '14 de Diciembre, 2025',
      summary: 'Notas tácticas de seguimiento y acuerdos del daily standup.',
      highlights: [
        '3 recordatorios críticos vinculados a proyectos activos',
        '2 riesgos escalados a dirección',
        'Notas convertidas en tareas durante la reunión matutina'
      ],
      items: [
        {
          id: 'nota-1',
          title: 'Migración de endpoints legacy',
          type: 'Nota',
          owner: 'Daniela Ruiz',
          summary: 'Resumen de dependencias pendientes antes de habilitar el nuevo gateway.',
          lastUpdated: '14/12 • 18:45'
        },
        {
          id: 'nota-2',
          title: 'Insights de sesión con cliente X',
          type: 'Nota',
          owner: 'Elias Montilla',
          summary: 'Se acordó congelar cambios visuales hasta cerrar pruebas de carga.',
          lastUpdated: '14/12 • 16:20'
        }
      ]
    },
    {
      id: 'notas-clave',
      label: 'Notas',
      value: 18,
      savedAt: '14 de Diciembre, 2025',
      summary: 'Notas tácticas de seguimiento y acuerdos del daily standup.',
      highlights: [
        '3 recordatorios críticos vinculados a proyectos activos',
        '2 riesgos escalados a dirección',
        'Notas convertidas en tareas durante la reunión matutina'
      ],
      items: [
        {
          id: 'nota-1',
          title: 'Migración de endpoints legacy',
          type: 'Nota',
          owner: 'Daniela Ruiz',
          summary: 'Resumen de dependencias pendientes antes de habilitar el nuevo gateway.',
          lastUpdated: '14/12 • 18:45'
        },
        {
          id: 'nota-2',
          title: 'Insights de sesión con cliente X',
          type: 'Nota',
          owner: 'Elias Montilla',
          summary: 'Se acordó congelar cambios visuales hasta cerrar pruebas de carga.',
          lastUpdated: '14/12 • 16:20'
        }
      ]
    },
    {
      id: 'tareas',
      label: 'Tareas',
      value: 12,
      savedAt: '14 de Diciembre, 2025',
      summary: 'Checklist de tareas arrastradas de la pizarra colaborativa.',
      highlights: [
        '5 tareas completadas y archivadas',
        '2 tareas bloqueadas esperando assets',
        'Recordatorio automático para QA a las 09:00'
      ],
      items: [
        {
          id: 'task-1',
          title: 'Refactorizar módulo de analítica',
          type: 'Tarea',
          owner: 'Juan Pérez',
          summary: 'Separar cálculos de agregación en workers y ajustar umbrales.',
          lastUpdated: '14/12 • 19:05'
        },
        {
          id: 'task-2',
          title: 'Checklist QA sprint 23',
          type: 'Tarea',
          owner: 'María Rodríguez',
          summary: 'Validaciones de regresión sobre los nuevos flujos de notificaciones.',
          lastUpdated: '14/12 • 15:10'
        }
      ]
    },
    {
      id: 'recursos',
      label: 'Recursos',
      value: 9,
      savedAt: '14 de Diciembre, 2025',
      summary: 'Vínculos y assets que se guardaron en la pizarra para seguimiento.',
      highlights: [
        '1 grabación de la sesión remota',
        'Plantilla de reporte financiero cargada desde drive',
        'Enlace directo al dashboard de Supabase'
      ],
      items: [
        {
          id: 'res-1',
          title: 'Grabación sync equipo producto',
          type: 'Recurso',
          owner: 'Equipo Producto',
          summary: 'Video MP4 con acuerdos del comité táctico (45 min).',
          lastUpdated: '14/12 • 12:00'
        },
        {
          id: 'res-2',
          title: 'Plantilla reporte financiero Q4',
          type: 'Recurso',
          owner: 'Finanzas',
          summary: 'Spreadsheet compartido con métricas clave y proyecciones.',
          lastUpdated: '14/12 • 11:30'
        }
      ]
    },
    {
      id: 'acuerdos',
      label: 'Acuerdos',
      value: 7,
      savedAt: '14 de Diciembre, 2025',
      summary: 'Compromisos finales acordados en la retrospectiva de equipo.',
      highlights: [
        'Cierre de sprint adelantado a jueves 17:00',
        'Definición de owners para incidentes críticos',
        'Kickoff de experimentos UX el próximo lunes'
      ],
      items: [
        {
          id: 'agr-1',
          title: 'Owner rotativo de guardia',
          type: 'Nota',
          owner: 'Ops',
          summary: 'Secuencia acordada para cubrir guardias nocturnas en diciembre.',
          lastUpdated: '14/12 • 17:40'
        }
      ]
    }
  ];

  const chartBarHeights = [48, 32, 64, 40, 32];
  const chartMaxHeight = Math.max(...chartBarHeights);

  const handleChartBarClick = (snapshot: BoardHistorySnapshot): void => {
    setSelectedHistorySnapshot(snapshot);
    setShowHistoryModal(true);
  };

  // Obtener misiones y actividades del proyecto seleccionado
  const misiones = useMemo(() => {
    if (!selectedProyectoId) {
      // Si no hay proyecto seleccionado, retornar todas las misiones de todos los proyectos
      return proyectos.flatMap(p => p.misiones || []);
    }
    const proyecto = proyectos.find(p => p.id === selectedProyectoId);
    return proyecto?.misiones || [];
  }, [selectedProyectoId, proyectos]);

  const actividades = useMemo(() => {
    if (!selectedProyectoId) {
      // Si no hay proyecto seleccionado, retornar todas las actividades de todos los proyectos
      return proyectos.flatMap(p => p.actividades || []);
    }
    const proyecto = proyectos.find(p => p.id === selectedProyectoId);
    return proyecto?.actividades || [];
  }, [selectedProyectoId, proyectos]);

  const handleAddResource = (): void => {
    setShowAddResourceModal(true);
  };

  const handleProyectoClick = (proyectoId: number): void => {
    setSelectedProyectoId(proyectoId);
  };

  const handleSaveResource = (newResourceData: NewResourceData): void => {
    const updatedResources = saveResource(newResourceData, recursos);
    setRecursos(updatedResources);
    setShowAddResourceModal(false);
  };

  const handleCloseAddResourceModal = (): void => {
    setShowAddResourceModal(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setInputText(value);
    setShowButtons(value.trim().length > 0);

    // Auto-resize the textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const lineHeight = 24; // 1.5rem = 24px
    const maxHeight = lineHeight * 5; // 5 lines max
    textarea.style.height = Math.min(scrollHeight, maxHeight) + 'px';
  };

  const handleCreateNote = (): void => {
    if (inputText.trim() && pizarraRef.current) {
      pizarraRef.current.addNoteCard(inputText.trim());
      setInputText('');
      setShowButtons(false);
    }
  };

  const handleCreateTodoList = (): void => {
    if (inputText.trim() && pizarraRef.current) {
      pizarraRef.current.addTodoCard(inputText.trim());
      setInputText('');
      setShowButtons(false);
    }
  };

  const handleSendMessage = (): void => {
    console.log('Enviar mensaje:', inputText);
    setInputText('');
    setShowButtons(false);
  };

  const getLineCount = (text: string): number => {
    if (!text) return 1;
    return text.split('\n').length;
  };

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}
    >
      <div className="absolute inset-0 z-30">
        <Pizarra ref={pizarraRef} />
      </div>

      {/* Toggle Button - Always visible */}
      <div className="fixed top-18 z-50 flex items-center transition-all duration-300">
        {/* Botón expandir o contraer*/}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className={`p-1 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg 
      transition-all duration-300 text-white fixed top-18
      ${rightPanelCollapsed ? 'right-38' : 'right-78'}`}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-300 ${rightPanelCollapsed ? 'rotate-180' : ''
              }`}
          />
        </button>

        {/* Cubo */}
        {rightPanelCollapsed && (
          <div className="fixed top-18 right-0">
            <Cube />
          </div>
        )}
      </div>

      {/* Panel fijo para el Acordeón (arriba) */}
      <div
        className={`fixed top-0 right-0 h-auto flex flex-col transition-all duration-300 z-30 ${rightPanelCollapsed ? "w-0" : "w-80"
          }`}
      >
        {!rightPanelCollapsed && (
          <div className="p-4 pt-16">
            <Accordion
              recursos={recursos}
              usuarios={mockUsuarios}
              proyectos={proyectos}
              onAddResource={handleAddResource}
              onProyectoClick={handleProyectoClick}
            />
          </div>
        )}
      </div>

      {/* Panel fijo para las horas y el capture (abajo) */}
      <div
        className={`fixed bottom-0 right-0 flex flex-col transition-all duration-300 z-40 ${rightPanelCollapsed ? "w-0" : "w-80"
          }`}
      >
        {!rightPanelCollapsed && (
          <div className="p-4 flex flex-col gap-3">
            {/* Time info cards */}
            <div className="flex gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
                <div className="text-white text-xl font-medium">2:12</div>
                <div className="text-white/70 text-sm">Tarea actual</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex-1">
                <div className="text-white text-xl font-medium">3:12</div>
                <div className="text-white/70 text-sm">Tiempo total hoy</div>
              </div>
            </div>

            {/* Capture */}
            <div className="h-32 border-2 border-green-500 rounded-2xl p-4 flex items-center justify-center text-green-500 font-medium">
              Capture
            </div>
          </div>
        )}
      </div>


      {/* Header - Left section - Perfil */}
      <div className="mb-8 px-2 z-50 pointer-events-auto w-fit">
        <Perfil
          nombre="Elias Montilla"
          empresa="Total Time Solutions"
          tipoUsuario="manager"
          saludPorcentaje={85}
          fotoUrl="/total-time_logo.png"
          showPizarraControls={true}
          onClearStorage={() => pizarraRef.current?.clearStorage?.()}
          onExportJSON={() => pizarraRef.current?.exportStorage?.()}
          onImportJSON={(content) => pizarraRef.current?.importStorage?.(content)}
        />
      </div>

      {/* Header - Left section - RelojActual */}
      <div className="pointer-events-auto " style={{ position: 'absolute', top: '0.5rem', left: '9rem', zIndex: 40 }}>
        <RelojActual />
      </div>

      {/* Center - Room tabs */}
      <div className="flex bg-white/20 z-30 backdrop-blur-sm rounded-full p-2 gap-1 absolute left-1/2 transform -translate-x-1/2">
        <button onClick={() => setShowSalaModal(true)} className="bg-green-200 text-gray-800 px-6 py-2 rounded-full font-medium">
          Avances <span className="bg-gray-600 px-1.5 py-1 rounded-full text-sm ml-1 text-white">8</span>
        </button>
        <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reglas</button>
        <button className="bg-gray-200 text-gray-800 px-6 py-2 rounded-full font-medium">Reportes</button>
      </div>

      {/* Main content area */}
      <div className="relative flex justify-between items-start px-2 flex-1">

      </div>

      {/* Activities positioned at fixed location */}
      <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '15rem', left: '1rem', zIndex: 30 }}>
        <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
          Actividades 🗓️
        </h2>
        <div
          // className="bg-white/20 rounded-lg cursor-grab flex items-center justify-center text-xs text-white font-medium hover:bg-white/30 transition-colors"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', 'Actividades - Elemento arrastrado desde la interfaz');
          }}
          onClick={() => setShowActividadDetails(true)}
        >
          <ActividadesGrid
            actividades={actividades}
            loading={loadingProyectos}
            onShowDetails={(actividad: Actividad) => {
              // Manejar detalles de actividad
            }}
          />
        </div>
      </div>




      {/* Chart positioned at bottom left */}
      <div
        className="flex items-end gap-2 pointer-events-auto"
        style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 60 }}
      >
        {previousDayBoardHistory.map((snapshot, index) => (
          <button
            key={snapshot.id}
            type="button"
            onClick={() => handleChartBarClick(snapshot)}
            className="group flex w-6 items-end justify-center rounded-sm bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{ height: chartMaxHeight }}
            title={`${snapshot.label}: ${snapshot.value} elementos`}
            aria-label={`${snapshot.label}: ${snapshot.value} elementos`}
          >
            <span
              className="w-6 rounded-sm bg-white/30 transition-all duration-150 group-hover:bg-white/50 group-active:scale-y-95"
              style={{ height: chartBarHeights[index] ?? 32 }}
            />
          </button>
        ))}
      </div>

      {/* Input centrado abajo */}
      <div className="flex flex-col items-center pointer-events-auto" style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', width: '100%', zIndex: 50 }}>
        {/* Botones de acción */}
        {showButtons && (
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-3 flex gap-3 max-w-md w-full">
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-white text-sm font-medium transition-colors"
              title="Crear Nota"
            >
              <StickyNote size={16} />
              <span>Nota</span>
            </button>
            <button
              onClick={handleCreateTodoList}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-white text-sm font-medium transition-colors"
              title="Crear Lista de Tareas"
            >
              <CheckSquare size={16} />
              <span>Tareas</span>
            </button>
            <button
              onClick={handleSendMessage}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg text-white text-sm font-medium transition-colors"
              title="Enviar"
            >
              <Send size={16} />
              <span>Enviar</span>
            </button>
          </div>
        )}

        {/* Input principal */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-start gap-3 max-w-md w-full">
          <div className="w-8 h-8 bg-white/30 rounded flex-shrink-0 mt-1"></div>
          <textarea
            value={inputText}
            onChange={handleInputChange}
            placeholder="Escribe aquí"
            className="flex-1 bg-transparent text-white placeholder-white/70 outline-none resize-none"
            style={{
              minHeight: '24px',
              maxHeight: '120px',
              lineHeight: '24px',
              overflowY: 'auto',
              wordWrap: 'break-word',
              whiteSpace: 'pre-wrap'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.shiftKey) {
                // Allow new line with Shift+Enter
                return;
              } else if (e.key === 'Enter') {
                // Send on Enter without Shift
                e.preventDefault();
                if (inputText.trim()) {
                  handleSendMessage();
                }
              }
            }}
          />
        </div>
      </div>



      {/* Ventana de prueba */}
      <Ventana
        isOpen={ventanaAbierta}
        onClose={() => setVentanaAbierta(false)}
        title="Ventana de Prueba"
        initialWidth={500}
        initialHeight={400}
      >
        <div className="text-black space-y-4">
          <h2 className="text-xl font-semibold">¡Funciona!</h2>
          <p className="text-black/80">
            Esta es una ventana modal que puedes arrastrar y redimensionar.
          </p>
          <div className="bg-white/10 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Controles:</h3>
            <ul className="text-sm text-black/70 space-y-1">
              <li>• Arrastra desde la barra de título</li>
              <li>• Redimensiona desde la esquina inferior derecha</li>
              <li>• Botón rojo: cerrar</li>
              <li>• Botón amarillo: minimizar</li>
              <li>• Botón verde: maximizar</li>
            </ul>
          </div>
        </div>
      </Ventana>

      {/* Modal historial pizarra */}
      <Ventana
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={selectedHistorySnapshot ? `Historial de la pizarra • ${selectedHistorySnapshot.savedAt}` : 'Historial de la pizarra'}
        initialWidth={960}
        initialHeight={640}
        minWidth={720}
        minHeight={480}
        showOverlay={true}
        defaultMaximized={true}
      >
        {selectedHistorySnapshot ? (
          <div className="text-black space-y-6 p-2 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedHistorySnapshot.label}</h2>
                <p className="text-gray-600 text-sm">
                  Historial de los elementos guardados en la pizarra del {selectedHistorySnapshot.savedAt}. Estos datos son de referencia hasta conectar la API real.
                </p>
              </div>
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                {selectedHistorySnapshot.value} elementos almacenados
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {selectedHistorySnapshot.highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700"
                >
                  {highlight}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Elementos guardados</h3>
                <span className="text-xs uppercase tracking-wide text-gray-500">Muestra del día anterior</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedHistorySnapshot.items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-xl bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 leading-snug">{item.title}</h4>
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-900/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.summary}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>{item.owner}</span>
                      <span>{item.lastUpdated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Ejemplo sincrónico: reemplaza este bloque con la respuesta del endpoint que devuelva el snapshot de la pizarra para la fecha solicitada.
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            Selecciona una barra del gráfico para ver el detalle de la pizarra del día anterior.
          </div>
        )}
      </Ventana>

      {/* Modal para añadir recurso */}
      <Ventana
        isOpen={showAddResourceModal}
        onClose={handleCloseAddResourceModal}
        title="Añadir Nuevo Recurso"
        initialWidth={500}
        initialHeight={600}
        minWidth={450}
        minHeight={550}
        showOverlay={true}
      >
        <AddResourceForm
          onSave={handleSaveResource}
          onClose={handleCloseAddResourceModal}
        />
      </Ventana>

      {/* Modal para detalles de actividad */}
      <Ventana
        isOpen={showActividadDetails}
        onClose={() => setShowActividadDetails(false)}
        title="Detalles de la Actividad"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        <div className="text-black space-y-6 p-4">
          {/* Asunto */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Asunto</h3>
            <p className="text-gray-700">Reunión con cliente - Revisión de proyecto Q4</p>
          </div>

          {/* Participantes */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Participantes</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  EM
                </div>
                <span>Elias Montilla (Organizador)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  JD
                </div>
                <span>Juan Pérez</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  MR
                </div>
                <span>María Rodríguez</span>
              </div>
            </div>
          </div>

          {/* Hora de comienzo */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Fecha y Hora</h3>
            <div className="bg-gray-100 p-3 rounded-lg">
              <p className="font-medium">15 de Diciembre, 2025</p>
              <p className="text-gray-600">2:30 PM - 3:30 PM</p>
            </div>
          </div>

          {/* Botón para abrir link */}
          <div className="flex justify-center pt-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              onClick={() => {
                window.open('https://meet.google.com/abc-defg-hij', '_blank');
              }}
            >
              Abrir enlace de la reunión
            </button>
          </div>
        </div>
      </Ventana>

      {/* Modal para detalles de misión */}
      <Ventana
        isOpen={showMisionDetails}
        onClose={() => setShowMisionDetails(false)}
        title="Detalles de la Misión"
        initialWidth={600}
        initialHeight={450}
        minWidth={500}
        minHeight={350}
        showOverlay={true}
      >
        {selectedMision && (
          <div className="text-black space-y-6 p-4">
            {/* Título de la misión */}
            <div>
              <h3 className="text-lg font-semibold mb-2">🎯 Misión</h3>
              <p className="text-gray-700 text-lg">{selectedMision.title}</p>
            </div>

            {/* Duración estimada */}
            <div>
              <h3 className="text-lg font-semibold mb-2">⏱️ Duración Estimada</h3>
              <div className="bg-green-100 p-3 rounded-lg">
                <p className="font-medium text-green-800">{selectedMision.hours} horas</p>
                <p className="text-green-600 text-sm">Tiempo aproximado para completar la misión</p>
              </div>
            </div>

            {/* Objetivos */}
            <div>
              <h3 className="text-lg font-semibold mb-2">📋 Objetivos</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Análisis de requisitos y alcance</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Desarrollo e implementación</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Pruebas y validación</span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">Documentación y entrega</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-center gap-3 pt-4">
              <button
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
                onClick={() => {
                  console.log('Iniciar misión:', selectedMision.title);
                  setShowMisionDetails(false);
                }}
              >
                ▶️ Iniciar Misión
              </button>
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                onClick={() => setShowMisionDetails(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Ventana>

      {/* Modal para Sala - Avances */}
      <Ventana
        isOpen={showSalaModal}
        onClose={() => setShowSalaModal(false)}
        title="Desarrollo Frontend - Avances"
        initialWidth={800}
        initialHeight={600}
        minWidth={600}
        minHeight={500}
        showOverlay={true}
        defaultMaximized={false}
      >
        <Sala />
      </Ventana>
    </div>
  );
}
