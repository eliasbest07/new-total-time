'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PerfilProps {
    nombre: string;
    empresa: string;
    tipoUsuario: 'admin' | 'manager' | 'empleado';
    saludPorcentaje: number;
    fotoUrl?: string;
}

const Perfil = ({
    nombre,
    empresa,
    tipoUsuario,
    saludPorcentaje,
    fotoUrl = '/default-avatar.png'
}: PerfilProps) => {
    const [menuAbierto, setMenuAbierto] = useState(false);

    // Colores del marco según tipo de usuario
    const coloresMarco = {
        admin: 'border-red-500',
        manager: 'border-blue-500',
        empleado: 'border-green-500'
    };

    const handleLogout = () => {
        // Lógica de logout
        console.log('Cerrando sesión...');
        setMenuAbierto(false);
    };

    const handleDashboard = () => {
        // Navegar al dashboard
        console.log('Ir al dashboard...');
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
                    <div className={`w-15 h-15 rounded-full border-4 ${coloresMarco[tipoUsuario]} flex items-center justify-center`}>
                        <div className="relative w-12 h-12 rounded-full overflow-hidden">
                            <Image
                                src={fotoUrl}
                                alt={`Foto de perfil de ${nombre}`}
                                fill
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Barra de salud vertical */}
                    <div className="w-3 h-16 bg-gray-300 rounded-full overflow-hidden">
                        <div
                            className="w-full bg-green-500 transition-all duration-300 rounded-full"
                            style={{ height: `100%` }}
                        />
                    </div>
                </div>

                {/* Nombre centrado debajo */}
                <span className="text-white font-medium text-lg">
                    {nombre}
                </span>
            </div>

            {/* Menú desplegable */}
            {menuAbierto && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
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

                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-red-600"
                        >
                            🚪 Cerrar Sesión
                        </button>
                    </div>
                </div>
            )}

            {/* Overlay para cerrar el menú al hacer clic fuera */}
            {menuAbierto && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuAbierto(false)}
                />
            )}
        </div>
    );
};

export default Perfil;