'use client';

import { useState } from 'react';
import Image from 'next/image';
import MenuDashboard from '../components/MenuDashboard';

// Componentes modulares
const UserProfile = () => (
    <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 sm:w-15 sm:h-15 rounded-full border-4 border-blue-500 flex items-center justify-center mb-2">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden">
                <Image
                    src="/total-time_logo.png"
                    alt="Foto de perfil de Usuario"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
        <span className="text-white font-medium text-base sm:text-lg text-center">
            Jesus Diaz
        </span>
    </div>
);

const LifeBar = () => (
    <div className="mb-6">
        <h3 className="text-white text-base sm:text-lg mb-3">Barra de Salud</h3>
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 max-w-xs h-4 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: '85%' }}></div>
            </div>
            <span className="text-white text-sm font-medium">85%</span>
        </div>
    </div>
);

const StatsCard = ({ value, label }: { value: string; label: string }) => (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0 flex-1">
        <div className="text-white text-lg sm:text-xl font-medium truncate">{value}</div>
        <div className="text-white/70 text-xs sm:text-sm">{label}</div>
    </div>
);

interface Tarea {
  id: number;
  nombre: string;
  tiempo: string;
  estado: string;
  todos?: { id: number; text: string; completed: boolean }[];
}

interface TaskCardProps {
    tarea: Tarea;
    onDelete: (id: number) => void;
    onCreateTodo: (tareaId: number) => void;
    onViewTodos: (tareaId: number) => void;
}

const TaskCard = ({ tarea, onDelete, onCreateTodo, onViewTodos }: TaskCardProps) => (
    <div className="bg-white/10 rounded-lg p-3 flex flex-col gap-2 relative group">
        {/* Botón de eliminar en la esquina */}
        <button
            onClick={() => onDelete(tarea.id)}
            className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs"
            title="Eliminar tarea"
        >
            ×
        </button>

        <div className="min-w-0 flex-1">
            <p className="text-white font-medium truncate pr-8">{tarea.nombre}</p>
            <p className="text-white/70 text-sm">{tarea.tiempo}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-1 rounded text-xs w-fit ${tarea.estado === 'completada'
                ? 'bg-green-600 text-white'
                : 'bg-yellow-600 text-white'
                }`}>
                {tarea.estado}
            </span>

            {/* Botones de acciones */}
            <div className="flex gap-1">
                {tarea.todos && tarea.todos.length > 0 && (
                    <button
                        onClick={() => onViewTodos(tarea.id)}
                        className="px-2 py-1 bg-blue-500/80 hover:bg-blue-600 text-white rounded text-xs transition-colors"
                        title="Ver lista TODO"
                    >
                        📋 {tarea.todos.length}
                    </button>
                )}
                <button
                    onClick={() => onCreateTodo(tarea.id)}
                    className="px-2 py-1 bg-purple-500/80 hover:bg-purple-600 text-white rounded text-xs transition-colors"
                    title="Crear lista TODO"
                >
                    + TODO
                </button>
            </div>
        </div>
    </div>
);

interface Screenshot {
  id: number;
  tiempo: string;
  aplicacion: string;
}

const ScreenshotCard = ({ screenshot }: { screenshot: Screenshot }) => (
    <div className="bg-white/10 rounded-lg p-3 flex justify-between items-center">
        <div className="min-w-0 flex-1">
            <p className="text-white font-medium truncate">{screenshot.aplicacion}</p>
            <p className="text-white/70 text-sm">{screenshot.tiempo}</p>
        </div>
        <div className="w-10 h-6 sm:w-12 sm:h-8 bg-white/20 rounded border flex-shrink-0"></div>
    </div>
);

export default function Dashboard() {
    const [menuLateralAbierto, setMenuLateralAbierto] = useState(false);

    // Datos de ejemplo
    const estadisticas = {
        tiempoHoy: '6:45',
        ultimaActividad: '2:30',
        tiempoSemana: '32:15'
    };

    const ultimasTareas = [
        { id: 1, nombre: 'Diseño de interfaz', tiempo: '2:30', estado: 'completada' },
        { id: 2, nombre: 'Revisión de código', tiempo: '1:45', estado: 'en progreso' },
        { id: 3, nombre: 'Testing de componentes', tiempo: '3:20', estado: 'completada' }
    ];

    const ultimosScreenshots = [
        { id: 1, tiempo: '14:30', aplicacion: 'VS Code' },
        { id: 2, tiempo: '14:15', aplicacion: 'Chrome' },
        { id: 3, tiempo: '14:00', aplicacion: 'Figma' }
    ];

    const handleSalirOrganizacion = () => {
        console.log('Salir de organización');
    };

    const handleVerMiembros = () => {
        console.log('Ver miembros');
    };

    const handleLogout = () => {
        console.log('Logout');
        window.location.href = '/demo';
    };

    const handleConfiguracion = () => {
        console.log('Configuración');
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            {/* Container principal con max-width */}
            <div className="max-w-7xl mx-auto relative">
                
                {/* Botón de perfil en esquina superior izquierda de la vista */}
                <button
                    onClick={() => setMenuLateralAbierto(true)}
                    className="absolute top-0 left-0 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-200 flex items-center gap-4 px-5 py-3 shadow-lg hover:shadow-xl group hover:scale-105 z-10"
                >
                    <div className="w-10 h-10 rounded-full border-2 border-blue-500 flex items-center justify-center">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <Image
                                src="/total-time_logo.png"
                                alt="Foto de perfil"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <span className="text-white font-medium text-base">Jesus Diaz</span>
                </button>

                {/* Header responsivo */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 pt-16">

                    {/* Sección izquierda - Perfil y estadísticas */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* <UserProfile /> */}
                        <LifeBar />

                        {/* Estadísticas responsivas */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                            <StatsCard value={estadisticas.tiempoHoy} label="Tiempo hoy" />
                            <StatsCard value={estadisticas.ultimaActividad} label="Última actividad" />
                            <StatsCard value={estadisticas.tiempoSemana} label="Esta semana" />
                        </div>
                    </div>

                    {/* Sección derecha - Organización */}
                    <div className="xl:col-span-1">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 h-fit">
                            <h3 className="text-white text-lg sm:text-xl font-medium mb-4">Organizacion: BTM Studio</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={handleVerMiembros}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm sm:text-base"
                                >
                                    Ver Miembros
                                </button>
                                <button
                                    onClick={handleSalirOrganizacion}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg transition-colors text-sm sm:text-base"
                                >
                                    Salir de Organización
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contenido principal - Grid responsivo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

                    {/* Mis últimas tareas */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 h-80">
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-4">Mis Últimas Tareas</h3>
                        <div className="h-60 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ultimasTareas.map(tarea => (
                                <TaskCard
                                    key={tarea.id}
                                    tarea={tarea}
                                    onDelete={() => {}}
                                    onCreateTodo={() => {}}
                                    onViewTodos={() => {}}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Mis últimos screenshots */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6">
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-4">Últimos Screenshots</h3>
                        <div className="space-y-3">
                            {ultimosScreenshots.map(screenshot => (
                                <ScreenshotCard key={screenshot.id} screenshot={screenshot} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu lateral */}
            <MenuDashboard
                isOpen={menuLateralAbierto}
                onClose={() => setMenuLateralAbierto(false)}
                onLogout={handleLogout}
                onConfiguracion={handleConfiguracion}
            />
        </div>
    );
}