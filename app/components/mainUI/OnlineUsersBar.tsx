"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuariosOrganizacion } from '@/hooks/useUsuariosOrganizacion';
import Image from 'next/image';

interface OnlineUsersBarProps {
  onUserClick: (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => void;
}

export default function OnlineUsersBar({ onUserClick }: OnlineUsersBarProps) {
  const { usuario } = useAuth();
  const { usuarios: usuariosOrganizacion } = useUsuariosOrganizacion(
    usuario?.idOrganizacion || null
  );

  // Filtrar usuarios excluyendo al usuario actual y ordenar por estado de conexión
  const usuariosFiltrados = useMemo(() => {
    if (!usuario) return usuariosOrganizacion;

    const filtrados = usuariosOrganizacion.filter(u => {
      return u.email !== usuario.email;
    });

    // Ordenar: conectados primero
    return filtrados.sort((a, b) => {
      // TODO: Aquí deberías tener un campo real de "online" en tu entidad Usuario
      // Por ahora, simularemos que todos están online
      return 0;
    });
  }, [usuariosOrganizacion, usuario]);

  // Mostrar solo los primeros 5 usuarios
  const usuariosVisibles = usuariosFiltrados.slice(0, 5);

  if (usuariosVisibles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 flex items-center gap-3">
      {usuariosVisibles.map((user) => {
        const colorMarco = user.profile.marco || '#3b82f6';
        const isOnline = true; // TODO: Implementar lógica real de estado online

        return (
          <button
            key={user.id}
            onClick={() => onUserClick({
              userId: user.userAuth,
              name: user.getNombreCompleto(),
              avatar: user.profile.avatar,
              color: colorMarco,
              online: isOnline
            })}
            className="relative group"
            title={`${user.getNombreCompleto()} - ${isOnline ? 'En línea' : 'Desconectado'}`}
          >
            {/* Avatar con marco de color */}
            <div
              className="w-12 h-12 rounded-full border-3 flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ borderColor: colorMarco, borderWidth: '3px' }}
            >
              <div className="relative w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src={user.profile.avatar || '/total-time_logo.png'}
                  alt={user.getNombreCompleto()}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Indicador de estado online */}
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}

            {/* Tooltip con nombre */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {user.getNombreCompleto()}
              </div>
            </div>
          </button>
        );
      })}

      {/* Indicador de más usuarios */}
      {usuariosFiltrados.length > 5 && (
        <div className="text-sm text-gray-600 font-medium">
          +{usuariosFiltrados.length - 5}
        </div>
      )}
    </div>
  );
}
