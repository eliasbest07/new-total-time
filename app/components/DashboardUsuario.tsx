"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MenuDashboardUsuario from './MenuDashboardUsuario';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOrganizacion } from '@/hooks/useOrganizacion';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';

/**
 * Dashboard para usuarios NO administradores
 * Replica el estilo visual del dashboard demo
 */

// Componentes modulares (igual que en el demo)
const UserProfile = ({ userName, userAvatar }: { userName: string; userAvatar: string }) => (
    <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 sm:w-15 sm:h-15 rounded-full border-4 border-blue-500 flex items-center justify-center mb-2">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden">
                <Image
                    src={userAvatar}
                    alt={`Foto de perfil de ${userName}`}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
        <span className="text-white font-medium text-base sm:text-lg text-center">
            {userName}
        </span>
    </div>
);

const LifeBar = ({ percentage }: { percentage: number }) => (
    <div className="mb-6">
        <h3 className="text-white text-base sm:text-lg mb-3">Barra de Vida</h3>
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 max-w-xs h-4 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="text-white text-sm font-medium">{percentage}%</span>
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
}

const TaskCard = ({ tarea }: { tarea: Tarea }) => (
    <div className="bg-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div className="min-w-0 flex-1">
            <p className="text-white font-medium truncate">{tarea.nombre}</p>
            <p className="text-white/70 text-sm">{tarea.tiempo}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs w-fit ${tarea.estado === 'completada'
            ? 'bg-green-600 text-white'
            : 'bg-yellow-600 text-white'
            }`}>
            {tarea.estado}
        </span>
    </div>
);

const ScreenshotCard = ({ capture, onImageClick }: { capture: Capture; onImageClick: (url: string) => void }) => {
    const formatDate = (date: Date) => {
        const now = new Date();
        const captureDate = new Date(date);
        const diffMs = now.getTime() - captureDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays < 7) return `Hace ${diffDays}d`;

        return captureDate.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short'
        });
    };

    return (
        <div className="bg-white/10 rounded-lg p-3 flex justify-between items-center gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-white font-medium truncate">{capture.mision_actividad || 'Actividad sin nombre'}</p>
                <p className="text-white/70 text-sm">{formatDate(capture.created_at)}</p>
                {capture.tiempo_tarea_actual && (
                    <p className="text-white/60 text-xs mt-1">Tiempo: {capture.tiempo_tarea_actual}</p>
                )}
            </div>
            {capture.img_url && (
                <button
                    onClick={() => onImageClick(capture.img_url!)}
                    className="w-16 h-12 bg-white/20 rounded border flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                >
                    <img
                        src={capture.img_url}
                        alt="Screenshot"
                        className="w-full h-full object-cover"
                    />
                </button>
            )}
        </div>
    );
};

export default function DashboardUsuario() {
    const { usuario } = useAuth();
    const { organizacion } = useOrganizacion(usuario?.userAuth || null);
    const [menuLateralAbierto, setMenuLateralAbierto] = useState(false);
    const [captures, setCaptures] = useState<Capture[]>([]);
    const [loadingCaptures, setLoadingCaptures] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const CAPTURES_PER_PAGE = 3;

    // Datos del usuario
    const userName = usuario?.getNombreCompleto() || 'Usuario';
    const userAvatar = usuario?.profile?.avatar || '/total-time_logo.png';
    const userOrganization = organizacion?.nombre || 'Sin organización';

    // Cargar captures del usuario
    useEffect(() => {
        const loadCaptures = async () => {
            if (!usuario?.userAuth) {
                setLoadingCaptures(false);
                return;
            }

            try {
                setLoadingCaptures(true);
                const captureRepo = new CaptureRepositorySupabase();
                const data = await captureRepo.getByUsuario(usuario.userAuth);
                setCaptures(data);
                setCurrentPage(0); // Reset a la primera página
            } catch (error) {
                console.error('Error al cargar captures:', error);
            } finally {
                setLoadingCaptures(false);
            }
        };

        loadCaptures();
    }, [usuario?.userAuth]);

    // Datos de ejemplo (frontend only)
    const estadisticas = {
        tiempoHoy: '6:45',
        ultimaActividad: '2:30',
        tiempoSemana: '32:15'
    };

    const ultimasTareas: Tarea[] = [
        { id: 1, nombre: 'Diseño de interfaz', tiempo: '2:30', estado: 'completada' },
        { id: 2, nombre: 'Revisión de código', tiempo: '1:45', estado: 'en progreso' },
        { id: 3, nombre: 'Testing de componentes', tiempo: '3:20', estado: 'completada' }
    ];

    const handleSalirOrganizacion = () => {
        console.log('Salir de organización');
    };

    const handleVerMiembros = () => {
        console.log('Ver miembros');
    };

    const handleLogout = () => {
        console.log('Logout');
        // Aquí iría la lógica de logout real
        window.location.href = '/';
    };

    const handleConfiguracion = () => {
        console.log('Configuración');
    };

    // Lógica de paginación
    const totalPages = Math.ceil(captures.length / CAPTURES_PER_PAGE);
    const startIndex = currentPage * CAPTURES_PER_PAGE;
    const endIndex = startIndex + CAPTURES_PER_PAGE;
    const currentCaptures = captures.slice(startIndex, endIndex);

    const handleNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-transparent">
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
                                src={userAvatar}
                                alt="Foto de perfil"
                                width={32}
                                height={32}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                    <span className="text-white font-medium text-base">{userName}</span>
                </button>

                {/* Header responsivo */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 pt-16">

                    {/* Sección izquierda - Perfil y estadísticas */}
                    <div className="xl:col-span-2 space-y-6">
                        <LifeBar percentage={85} />

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
                            <h3 className="text-white text-lg sm:text-xl font-medium mb-4">
                                Organización: {userOrganization}
                            </h3>
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
                                <TaskCard key={tarea.id} tarea={tarea} />
                            ))}
                        </div>
                    </div>

                    {/* Mis últimos screenshots */}
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 h-80 flex flex-col">
                        <h3 className="text-white text-lg sm:text-xl font-medium mb-4">Últimos Screenshots</h3>

                        {/* Contenido con altura fija */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {loadingCaptures ? (
                                <div className="text-white/70 text-center py-8">
                                    Cargando captures...
                                </div>
                            ) : captures.length > 0 ? (
                                currentCaptures.map(capture => (
                                    <ScreenshotCard
                                        key={capture.id}
                                        capture={capture}
                                        onImageClick={setSelectedImage}
                                    />
                                ))
                            ) : (
                                <div className="text-white/70 text-center py-8">
                                    No hay captures disponibles
                                </div>
                            )}
                        </div>

                        {/* Paginación */}
                        {!loadingCaptures && captures.length > CAPTURES_PER_PAGE && (
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={currentPage === 0}
                                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                        currentPage === 0
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    ← Anterior
                                </button>

                                <span className="text-white/70 text-sm">
                                    Página {currentPage + 1} de {totalPages}
                                </span>

                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages - 1}
                                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                                        currentPage === totalPages - 1
                                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    Siguiente →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu lateral */}
            <MenuDashboardUsuario
                isOpen={menuLateralAbierto}
                onClose={() => setMenuLateralAbierto(false)}
                onLogout={handleLogout}
                onConfiguracion={handleConfiguracion}
                userName={userName}
                userOrganization={userOrganization}
                userAvatar={userAvatar}
            />
        </div>
    );
}
