'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { SupabaseAuthRepository } from '@/infrastructure/datasource/SupabaseAuthRepository';

interface PerfilProps {
    // Props opcionales para override, si no se pasan usa los del contexto
    nombre?: string;
    empresa?: string;
    tipoUsuario?: 'admin' | 'manager' | 'empleado';
    saludPorcentaje?: number;
    fotoUrl?: string;
    // Props para funciones de pizarra
    onClearStorage?: () => void;
    onExportJSON?: () => void;
    onImportJSON?: (content: string) => void;
    onSaveToSupabase?: () => void;
    onLoadFromSupabase?: () => void;
    showPizarraControls?: boolean;
    // Prop para modo light
    lightMode?: boolean;
}

const Perfil = ({
    nombre: nombreProp,
    empresa: empresaProp,
    tipoUsuario: tipoUsuarioProp,
    saludPorcentaje: saludPorcentajeProp,
    fotoUrl: fotoUrlProp,
    onClearStorage,
    onExportJSON,
    onImportJSON,
    onSaveToSupabase,
    onLoadFromSupabase,
    showPizarraControls = false,
    lightMode = false
}: PerfilProps = {}) => {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { usuario, clearUsuario } = useAuth();
    const router = useRouter();
    const authRepository = new SupabaseAuthRepository();

    // Esperar a que el componente se monte en el cliente
    useEffect(() => {
        setMounted(true);
    }, []);

    // Usar datos del contexto si no se pasan como props
    // Durante SSR/hydration, usar valores por defecto estables
    const nombre = mounted ? (nombreProp || usuario?.getNombreCompleto() || 'Usuario') : 'Usuario';
    const empresa = mounted ? (empresaProp || usuario?.profile.nombreOrganizacion || 'Sin empresa') : 'Sin empresa';
    const tipoUsuario = mounted ? (tipoUsuarioProp || (usuario?.admin ? 'admin' : 'empleado')) : 'empleado';
    const saludPorcentaje = mounted ? (saludPorcentajeProp || usuario?.barraSalud || 100) : 100;
    const fotoUrl = mounted ? (fotoUrlProp || usuario?.profile.avatar || '/total-time_logo.png') : '/total-time_logo.png';

    // Colores de respaldo por tipo de usuario si no hay color personalizado
    const coloresMarcoRespaldo = {
        admin: '#ef4444',
        manager: '#3b82f6',
        empleado: '#10b981'
    };

    // Usar color personalizado o color por tipo de usuario
    const colorMarcoFinal = mounted
        ? (usuario?.profile.marco || coloresMarcoRespaldo[tipoUsuario])
        : coloresMarcoRespaldo['empleado'];

    const handleLogout = async () => {
        try {
            await authRepository.logout();
            clearUsuario();
            router.push('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
        setMenuAbierto(false);
    };

    const handleDashboard = () => {
        router.push('/dashboard');
        setMenuAbierto(false);
    };

    return (
        <div className="relative w-fit">
            {/* Contenedor principal del perfil */}
            <div
                className="flex flex-col items-center cursor-pointer p-1 rounded-lg hover:bg-white/10 transition-colors w-fit"
                onClick={() => setMenuAbierto(!menuAbierto)}
            >
                {/* Contenedor de foto y barra vertical */}
                <div className="flex items-center gap-3 mb-2">
                    {/* Foto de perfil con marco de color */}
                    <div 
                        className="w-15 h-15 rounded-full border-4 flex items-center justify-center"
                        style={{ borderColor: colorMarcoFinal }}
                    >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                            <Image
                                src={fotoUrl}
                                alt={`Foto de perfil de Usuario`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Barra de salud vertical */}
                    <div className="w-3 h-16 bg-gray-300 rounded-full overflow-hidden">
                        <div
                            className="w-full bg-green-500 transition-all duration-300 rounded-full"
                            style={{ height: `${saludPorcentaje}%` }}
                        />
                    </div>
                </div>

                {/* Nombre centrado debajo */}
                <span className={`${lightMode ? 'text-black' : 'text-white'} font-medium text-lg`}>
                    {nombre}
                </span>
            </div>

            {/* Menú desplegable */}
            {menuAbierto && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200" style={{ zIndex: 60 }}>
                    <div className="p-4 border-b border-gray-200">
                        <p className="text-sm text-gray-600">Empresa:</p>
                        <p className="font-medium text-gray-900">{empresa}</p>
                    </div>

                    <div className="py-2">
                        <button
                            onClick={handleDashboard}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-gray-700"
                        >
                            📊 Dashboard
                        </button>

                        {/* Controles de Pizarra */}
                        {showPizarraControls && (
                            <>
                                <div className="px-4 py-2 border-t border-gray-200 bg-blue-50">
                                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">☁️ Pizarra Datos</p>
                                </div>

                                <button
                                    onClick={() => {
                                        onSaveToSupabase?.();
                                        setMenuAbierto(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-blue-600"
                                    title="Guardar pizarra actual en Supabase (solo pizarra de hoy)"
                                >
                                    💾 Guardar en la Nube
                                </button>

                                <button
                                    onClick={() => {
                                        onLoadFromSupabase?.();
                                        setMenuAbierto(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-green-600"
                                    title="Cargar pizarra del día desde Supabase"
                                >
                                    📥 Cargar de la Nube
                                </button>

                                <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
                                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">📦 Pizarra en Local</p>
                                </div>

                                <button
                                    onClick={() => {
                                        onExportJSON?.();
                                        setMenuAbierto(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-blue-600"
                                    title="Exportar pizarra como JSON"
                                >
                                    📤 Exportar JSON
                                </button>

                                <button
                                    onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = '.json';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (e) => {
                                                    try {
                                                        const content = e.target?.result as string;
                                                        onImportJSON?.(content);
                                                        // alert('✅ Pizarra importada exitosamente');
                                                    } catch (error) {
                                                        // alert('❌ Error al importar: ' + error);
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }
                                        };
                                        input.click();
                                        setMenuAbierto(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-green-600"
                                    title="Importar pizarra desde JSON"
                                >
                                    📥 Importar JSON
                                </button>

                                <button
                                    onClick={() => {
                                        onClearStorage?.();
                                        setMenuAbierto(false);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-red-600 border-t border-gray-200"
                                    title="Limpiar pizarra y localStorage"
                                >
                                    🗑️ Limpiar Todo
                                </button>
                            </>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-red-600 border-t border-gray-200"
                        >
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay para cerrar el menú al hacer clic fuera */}
            {menuAbierto && (
                <div
                    className="fixed inset-0"
                    style={{ zIndex: 29 }}
                    onClick={() => setMenuAbierto(false)}
                />
            )}
        </div>
    );
};

export default Perfil;