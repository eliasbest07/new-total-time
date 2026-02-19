"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import MenuDashboardUsuario from './MenuDashboardUsuario';
import IntervalosTiempo from './IntervalosTiempo';
import CalendarioSemanalUsuario from './CalendarioSemanalUsuario';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOrganizacion } from '@/hooks/useOrganizacion';
import { useUsuariosOrganizacion } from '@/hooks/useUsuariosOrganizacion';
import { useSimpleTracking } from '@/hooks/useSimpleTracking';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';
import { MisionActiva } from '@/domain/entities/MisionActiva';
import { Target, ChevronRight, ChevronLeft, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import PizarraPermissionRequests from './PizarraPermissionRequests';
import { SupabaseAuthRepository } from '@/infrastructure/datasource/SupabaseAuthRepository';

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
        <h3 className="text-white text-base sm:text-lg mb-3">Barra de Salud</h3>
        <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex-1 max-w-xs h-4 sm:h-6 bg-gray-300 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}></div>
            </div>
            <span className="text-white text-sm font-medium">{percentage}%</span>
        </div>
    </div>
);

const StatsCard = ({ value, label, isLoading }: { value: string; label: string; isLoading?: boolean }) => (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0 flex-1">
        {isLoading ? (
            <div className="flex items-center justify-center h-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            </div>
        ) : (
            <div className="text-white text-lg sm:text-xl font-medium truncate">{value}</div>
        )}
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

const MisionActivaCard = ({ mision, onImageClick }: { mision: MisionActiva; onImageClick: (url: string) => void }) => {
    const [currentCaptureIndex, setCurrentCaptureIndex] = useState(0);
    // TODO: Obtener capturas desde la tabla 'capture' usando id_bloque = mision.id_referencia
    const capturas: string[] = [];

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };

    const getEstadoBadge = (estado: string) => {
        const badges: Record<string, string> = {
            'pendiente': 'bg-gray-500',
            'en_progreso': 'bg-blue-500',
            'pausada': 'bg-yellow-500',
            'entregada': 'bg-green-500',
            'aprobada': 'bg-emerald-600',
            'rechazada': 'bg-red-500',
            'cancelada': 'bg-gray-600'
        };
        return badges[estado] || 'bg-gray-500';
    };

    return (
        <div className="bg-white/10 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-white flex-shrink-0" />
                        <p className="text-white font-medium truncate">
                            {mision.tipo === 'mision' ? 'Ticket' : 'Actividad'} #{mision.id_referencia}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs text-white ${getEstadoBadge(mision.estado)}`}>
                            {mision.estado.replace('_', ' ')}
                        </span>
                        {mision.tiempo_total_segundos > 0 && (
                            <span className="text-white/60 text-xs">
                                ⏱️ {formatTime(mision.tiempo_total_segundos)}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Capturas */}
            {capturas.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-white/70 text-xs">
                            Capturas ({capturas.length})
                        </span>
                        {capturas.length > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentCaptureIndex(Math.max(0, currentCaptureIndex - 1))}
                                    disabled={currentCaptureIndex === 0}
                                    className={`p-1 rounded ${currentCaptureIndex === 0 ? 'text-white/30' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-white/60 text-xs">
                                    {currentCaptureIndex + 1}/{capturas.length}
                                </span>
                                <button
                                    onClick={() => setCurrentCaptureIndex(Math.min(capturas.length - 1, currentCaptureIndex + 1))}
                                    disabled={currentCaptureIndex === capturas.length - 1}
                                    className={`p-1 rounded ${currentCaptureIndex === capturas.length - 1 ? 'text-white/30' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onImageClick(capturas[currentCaptureIndex])}
                        className="w-full h-24 bg-white/20 rounded border overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                    >
                        <img
                            src={capturas[currentCaptureIndex]}
                            alt={`Captura ${currentCaptureIndex + 1}`}
                            className="w-full h-full object-cover"
                        />
                    </button>
                </div>
            )}
            {capturas.length === 0 && (
                <div className="text-white/50 text-xs text-center py-2">
                    Sin capturas aún
                </div>
            )}
        </div>
    );
};

export default function DashboardUsuario() {
    const { usuario, clearUsuario, isUserOnline } = useAuth();
    const { organizacion } = useOrganizacion(usuario?.userAuth || null);
    const { usuarios: miembrosOrganizacion } = useUsuariosOrganizacion(organizacion?.id || null);
    const router = useRouter();
    const authRepository = new SupabaseAuthRepository();
    const [menuLateralAbierto, setMenuLateralAbierto] = useState(false);
    const [captures, setCaptures] = useState<Capture[]>([]);
    const [loadingCaptures, setLoadingCaptures] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [misionesActivas, setMisionesActivas] = useState<MisionActiva[]>([]);
    const [loadingMisiones, setLoadingMisiones] = useState(true);

    const CAPTURES_PER_PAGE = 3;

    // Datos del usuario
    const userName = usuario?.getNombreCompleto() || 'Usuario';
    const userAvatar = usuario?.profile?.avatar || '/total-time_logo.png';
    const userOrganization = organizacion?.nombre || 'Sin organización';
    const userHealth = usuario?.barraSalud ?? 100;

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

    // Cargar misiones activas del usuario
    useEffect(() => {
        const loadMisionesActivas = async () => {
            if (!usuario?.userAuth) {
                setLoadingMisiones(false);
                return;
            }

            try {
                setLoadingMisiones(true);
                const { supabase } = await import('@/infrastructure/services/SupabaseClient');

                const { data, error } = await supabase
                    .from('misiones_activas')
                    .select('*')
                    .eq('id_usuario_asignado', usuario.userAuth)
                    .in('estado', ['en_progreso', 'pausada', 'entregada'])
                    .order('updated_at', { ascending: false });

                if (error) {
                    console.error('Error al cargar misiones activas:', error);
                } else {
                    setMisionesActivas(data || []);
                }
            } catch (error) {
                console.error('Error al cargar misiones activas:', error);
            } finally {
                setLoadingMisiones(false);
            }
        };

        loadMisionesActivas();
    }, [usuario?.userAuth]);

    console.log('🎨 [DASHBOARD] Componente DashboardUsuario renderizando...');

    // Tracking simple - Ahora usa Supabase en lugar de localStorage
    const { estadisticas, isLoading: isLoadingStats } = useSimpleTracking();
    console.log('🎨 [DASHBOARD] Estadísticas obtenidas desde Supabase:', estadisticas);
    console.log('🎨 [DASHBOARD] Estado de carga:', isLoadingStats);

    const ultimasTareas: Tarea[] = [
        { id: 1, nombre: 'Diseño de interfaz', tiempo: '2:30', estado: 'completada' },
        { id: 2, nombre: 'Revisión de código', tiempo: '1:45', estado: 'en progreso' },
        { id: 3, nombre: 'Testing de componentes', tiempo: '3:20', estado: 'completada' }
    ];

    const handleSalirOrganizacion = () => {
        console.log('Salir de organización');
    };

    const handleLogout = async () => {
        try {
            await authRepository.logout();
        } catch (error) {
            console.error('Error al cerrar sesión en Supabase:', error);
        } finally {
            clearUsuario();
            router.push('/login');
        }
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
            {/* Componente para ver solicitudes de permiso de pizarra */}
            <PizarraPermissionRequests />

            {/* Container principal con max-width */}
            <div className="max-w-7xl mx-auto relative">

                {/* Botón de flecha de regreso y perfil en esquina superior izquierda */}
                <div className="absolute top-0 left-0 flex items-center gap-3 z-10">
                    {/* Botón de flecha de regreso */}
                    <button
                        onClick={() => router.push('/')}
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-200 p-3 shadow-lg hover:shadow-xl hover:scale-105"
                        title="Regresar a la pizarra principal"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    {/* Botón de perfil */}
                    <button
                        onClick={() => setMenuLateralAbierto(true)}
                        className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl transition-all duration-200 flex items-center gap-4 px-5 py-3 shadow-lg hover:shadow-xl group hover:scale-105"
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
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="text-white font-medium text-base truncate">{userName}</span>
                            <div className="w-20 h-2 bg-white/25 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(0, Math.min(100, userHealth))}%` }}
                                />
                            </div>
                        </div>
                    </button>
                </div>

                <div className="pt-16 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
                    {/* Header responsivo */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">

                        {/* Sección izquierda - Perfil y estadísticas */}
                        <div className="xl:col-span-2 space-y-6">
                            <LifeBar percentage={85} />

                            {/* Estadísticas responsivas */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                <StatsCard value={estadisticas.tiempoHoy} label="Tiempo hoy" isLoading={isLoadingStats} />
                                <StatsCard value={estadisticas.ultimaActividad} label="Última actividad" isLoading={isLoadingStats} />
                                <StatsCard value={estadisticas.tiempoSemana} label="Esta semana" isLoading={isLoadingStats} />
                            </div>
                        </div>

                        {/* Sección derecha - Organización */}
                        <div className="xl:col-span-1">
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 h-fit">
                                <h3 className="text-white text-lg sm:text-xl font-medium mb-4">
                                    {userOrganization}
                                </h3>

                                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                                    {miembrosOrganizacion.length > 0 ? (
                                        miembrosOrganizacion.map((miembro) => {
                                            const online = isUserOnline(miembro.userAuth);
                                            return (
                                                <div
                                                    key={miembro.userAuth}
                                                    className="relative flex-shrink-0"
                                                    title={`${miembro.getNombreCompleto()} - ${online ? 'Online' : 'Offline'}`}
                                                >
                                                    <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-white/10">
                                                        <Image
                                                            src={miembro.profile.avatar || '/total-time_logo.png'}
                                                            alt={miembro.getNombreCompleto()}
                                                            width={40}
                                                            height={40}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <span
                                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${
                                                            online ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}
                                                    />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="text-white/60 text-sm">Sin miembros disponibles</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contenido principal - Grid responsivo */}
                    <div className="space-y-6 lg:space-y-8 pb-4">
                        {/* Intervalos de Tiempo - Ancho completo */}
                        {/* {usuario?.userAuth && (
                            <IntervalosTiempo userId={usuario.userAuth} />
                        )} */}

                        {/* Calendario semanal por captures (dashboard persona) */}
                        {usuario?.userAuth && (
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-2 sm:p-3">
                                <CalendarioSemanalUsuario
                                    userId={usuario.userAuth}
                                    userName={userName}
                                />
                            </div>
                        )}

                        {/* Grid de tareas y screenshots */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                        {/* Mis Misiones Activas */}
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 h-80 flex flex-col">
                            <h3 className="text-white text-lg sm:text-xl font-medium mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5" />
                                Mis Tickets Activos
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                                {loadingMisiones ? (
                                    <div className="text-white/70 text-center py-8">
                                        Cargando tickets...
                                    </div>
                                ) : misionesActivas.length > 0 ? (
                                    misionesActivas.map(mision => (
                                        <MisionActivaCard
                                            key={mision.id}
                                            mision={mision}
                                            onImageClick={setSelectedImage}
                                        />
                                    ))
                                ) : (
                                    <div className="text-white/70 text-center py-8">
                                        No tienes tickets activos
                                    </div>
                                )}
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

            {/* Modal de imagen */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-2 rounded-lg transition-colors z-10"
                        >
                            ✕
                        </button>
                        <img
                            src={selectedImage}
                            alt="Captura ampliada"
                            className="max-w-full max-h-full object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
