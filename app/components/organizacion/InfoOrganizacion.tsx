"use client";

import { useOrganizacion } from "@/hooks/useOrganizacion";
import { useAuth } from "@/app/contexts/AuthContext";
import { useUsuariosOrganizacionContext } from "@/app/contexts/UsuariosOrganizacionContext";
import { useState, useEffect } from "react";
import { Building2, Crown, Users, Clock } from "lucide-react";
import Image from "next/image";
import { Usuario } from "@/domain/entities/Usuario";
import { SupabaseUsuarioRepository } from "@/infrastructure/datasource/SupabaseUsuarioRepository";
import { useUserTracking } from "@/hooks/useUserTracking";
// Componente para mostrar las estadísticas de un usuario
const UserStatsRow = ({ usuario, onClick }: { usuario: Usuario; onClick?: () => void }) => {
  const { estadisticas, isLoading } = useUserTracking(usuario.userAuth);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer hover:shadow-md"
    >
      {/* Avatar del usuario */}
      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        {usuario.profile.avatar ? (
          <Image
            src={usuario.profile.avatar}
            alt={usuario.getNombreCompleto()}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold text-sm">
            {usuario.profile.nombre.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Nombre del usuario */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {usuario.getNombreCompleto()}
        </p>
      </div>

      {/* Estadísticas */}
      <div className="flex gap-3 items-center">
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-600 border-t-transparent"></div>
        ) : (
          <>
            <div className="text-right">
              <p className="text-xs text-gray-500">Hoy</p>
              <p className="text-sm font-semibold text-gray-900">{estadisticas.tiempoHoy}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Semana</p>
              <p className="text-sm font-semibold text-gray-900">{estadisticas.tiempoSemana}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

interface InfoOrganizacionProps {
  onUsuarioClick?: (userId: string, userName: string) => void;
}

export default function InfoOrganizacion({ onUsuarioClick }: InfoOrganizacionProps) {
  const { usuario } = useAuth();
  const { organizacion, loading, error } = useOrganizacion(usuario?.userAuth || null);
  const { usuarios: usuariosOrganizacion } = useUsuariosOrganizacionContext();
  const [adminUsuario, setAdminUsuario] = useState<Usuario | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Cargar información del administrador
  useEffect(() => {
    const loadAdmin = async () => {
      if (!organizacion?.idAdmin) return;

      try {
        setLoadingAdmin(true);
        const usuarioRepo = new SupabaseUsuarioRepository();
        const admin = await usuarioRepo.getUsuarioByAuthId(organizacion.idAdmin);
        setAdminUsuario(admin);
      } catch (err) {
        console.error("Error cargando administrador:", err);
      } finally {
        setLoadingAdmin(false);
      }
    };

    loadAdmin();
  }, [organizacion?.idAdmin]);

  if (loading) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Cargando organización...</span>
        </div>
      </div>
    );
  }

  if (error || !organizacion) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
        <div className="text-center py-4">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-gray-600">
            {error || "No perteneces a ninguna organización"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
      {/* Header con avatar de la organización */}
      <div className="flex items-start gap-4 mb-6">
        {/* Avatar de la organización */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-lg">
            {organizacion.img_profile ? (
              <Image
                src={organizacion.img_profile}
                alt={organizacion.nombre}
                fill
                className="object-cover"
              />
            ) : (
              <Building2 className="w-10 h-10 text-white" />
            )}
          </div>
          {/* Badge de nivel de suscripción */}
          <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">
            {organizacion.nivelDeSuscripcion.toUpperCase()}
          </div>
        </div>

        {/* Información de la organización */}
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-gray-900 truncate">
            {organizacion.nombre || "Sin nombre"}
          </h2>
          {organizacion.sector && (
            <p className="text-sm text-gray-600 mt-1">
              📊 {organizacion.sector}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                organizacion.isActive
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  organizacion.isActive ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              {organizacion.isActive ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>
      </div>

      {/* Información del administrador */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-yellow-500" />
          <h3 className="text-sm font-semibold text-gray-700">Administrador</h3>
        </div>

        {loadingAdmin ? (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
            Cargando...
          </div>
        ) : adminUsuario ? (
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            {/* Avatar del admin */}
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
              {adminUsuario.profile.avatar ? (
                <Image
                  src={adminUsuario.profile.avatar}
                  alt={adminUsuario.getNombreCompleto()}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-semibold">
                  {adminUsuario.profile.nombre.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info del admin */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {adminUsuario.getNombreCompleto()}
              </p>
              <p className="text-xs text-gray-600 truncate">
                @{adminUsuario.profile.username}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No se pudo cargar la información del administrador</p>
        )}
      </div>

      {/* Estadísticas de la organización */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          {/* Usuarios */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {organizacion.usuarios?.length || 0}
            </p>
            <p className="text-xs text-gray-600">Usuarios</p>
          </div>

          {/* Proyectos */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <span className="text-xl">📁</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {organizacion.proyectos?.length || 0}
            </p>
            <p className="text-xs text-gray-600">Proyectos</p>
          </div>

          {/* Salas */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <span className="text-xl">🏠</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {organizacion.id_salas?.length || 0}
            </p>
            <p className="text-xs text-gray-600">Salas</p>
          </div>
        </div>
      </div>

      {/* Progreso de usuarios */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Progreso de Usuarios</h3>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {usuariosOrganizacion.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No hay usuarios en la organización
            </p>
          ) : (
            usuariosOrganizacion.map((usr) => (
              <UserStatsRow
                key={usr.id}
                usuario={usr}
                onClick={() => {
                  if (onUsuarioClick) {
                    onUsuarioClick(usr.userAuth, usr.getNombreCompleto());
                  }
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
