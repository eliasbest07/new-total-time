'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { SupabasePizarraPermissionRepository } from '@/infrastructure/datasource/SupabasePizarraPermissionRepository';
import { PizarraPermission } from '@/domain/entities/PizarraPermission';
import { CheckCircle, X, Users } from 'lucide-react';

interface UserInfo {
  id: number;
  nombre: string;
  avatar?: string;
}

export default function PizarraPermissionRequests() {
  const { usuario } = useAuth();
  const [requests, setRequests] = useState<PizarraPermission[]>([]);
  const [usersInfo, setUsersInfo] = useState<Map<number, UserInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const repo = new SupabasePizarraPermissionRepository();

  // Cargar solicitudes pendientes
  useEffect(() => {
    const loadRequests = async () => {
      if (!usuario?.id) return;

      setLoading(true);
      try {
        const pending = await repo.getPendingRequests(usuario.id);
        setRequests(pending);

        // Cargar información de los usuarios que solicitan
        if (pending.length > 0) {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');
          const userIds = pending.map(r => r.id_usuario_editor);

          const { data, error } = await supabase
            .from('usuario')
            .select('id, nombre, username, profile')
            .in('id', userIds);

          if (data && !error) {
            const usersMap = new Map<number, UserInfo>();
            data.forEach((u: any) => {
              usersMap.set(parseInt(u.id), {
                id: parseInt(u.id),
                nombre: u.nombre || u.username || 'Usuario',
                avatar: u.profile?.avatar
              });
            });
            setUsersInfo(usersMap);
          }
        }
      } catch (error) {
        console.error('Error cargando solicitudes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();

    // Recargar cada 30 segundos
    const interval = setInterval(loadRequests, 30000);
    return () => clearInterval(interval);
  }, [usuario?.id]);

  // Otorgar permiso
  const handleGrant = async (request: PizarraPermission) => {
    if (!usuario?.id) return;

    try {
      await repo.updatePermission(usuario.id, request.id_usuario_editor, {
        granted: true
      });

      // Actualizar lista
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error otorgando permiso:', error);
    }
  };

  // Rechazar solicitud
  const handleReject = async (request: PizarraPermission) => {
    if (!usuario?.id) return;

    try {
      // Simplemente eliminar la solicitud (podrías también marcarla como rechazada)
      const { supabase } = await import('@/infrastructure/services/SupabaseClient');
      await supabase
        .from('pizarra_permissions')
        .delete()
        .eq('id', request.id);

      // Actualizar lista
      setRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
    }
  };

  if (requests.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 pointer-events-auto">
      {/* Badge de notificación */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3 shadow-lg transition-all duration-200 relative"
        >
          <Users className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {requests.length}
          </div>
        </button>
      )}

      {/* Panel expandido */}
      {expanded && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <h3 className="font-semibold">
                Solicitudes de Edición ({requests.length})
              </h3>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="hover:bg-blue-700 rounded p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lista de solicitudes */}
          <div className="max-h-96 overflow-y-auto">
            {requests.map(request => {
              const userInfo = usersInfo.get(request.id_usuario_editor);
              return (
                <div
                  key={request.id}
                  className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {userInfo?.avatar ? (
                          <img
                            src={userInfo.avatar}
                            alt={userInfo.nombre}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          userInfo?.nombre.substring(0, 2).toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {userInfo?.nombre || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Solicita editar tu pizarra
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleGrant(request)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded-lg p-2 transition-colors"
                        title="Otorgar permiso"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleReject(request)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 transition-colors"
                        title="Rechazar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
