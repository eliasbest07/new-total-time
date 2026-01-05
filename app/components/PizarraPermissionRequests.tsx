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

interface UserDataFromDB {
  id: string | number;
  nombre?: string;
  username?: string;
  profile?: {
    avatar?: string;
  };
}

export default function PizarraPermissionRequests() {
  const { usuario } = useAuth();
  const [requests, setRequests] = useState<PizarraPermission[]>([]);
  const [usersInfo, setUsersInfo] = useState<Map<number, UserInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentUserNumericId, setCurrentUserNumericId] = useState<number | null>(null);

  const repo = new SupabasePizarraPermissionRepository();

  // Cargar ID numérico del usuario actual
  useEffect(() => {
    const loadCurrentUserNumericId = async () => {
      if (!usuario?.userAuth) {
        console.log('❌ [PizarraPermissionRequests] No hay usuario.userAuth disponible');
        return;
      }

      try {
        console.log('🔍 [PizarraPermissionRequests] Cargando ID numérico para userAuth:', usuario.userAuth);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data, error } = await supabase
          .from('usuario')
          .select('id')
          .eq('id_usuario', usuario.userAuth)
          .maybeSingle();

        if (!error && data) {
          const numericId = parseInt(data.id);
          console.log('✅ [PizarraPermissionRequests] ID numérico obtenido:', numericId);
          setCurrentUserNumericId(numericId);
        } else {
          console.error('❌ [PizarraPermissionRequests] Error obteniendo ID numérico:', error);
        }
      } catch (error) {
        console.error('❌ [PizarraPermissionRequests] Error en loadCurrentUserNumericId:', error);
      }
    };

    loadCurrentUserNumericId();
  }, [usuario?.userAuth]);

  // Cargar solicitudes pendientes
  useEffect(() => {
    const loadRequests = async () => {
      console.log('🔍 [PizarraPermissionRequests] Cargando solicitudes para usuario:', {
        usuarioId: usuario?.id,
        usuarioUserAuth: usuario?.userAuth,
        usuarioEmail: usuario?.email,
        usuarioNombre: usuario?.getNombreCompleto?.(),
        currentUserNumericId
      });

      if (!currentUserNumericId) {
        console.log('❌ [PizarraPermissionRequests] No hay currentUserNumericId disponible');
        return;
      }

      setLoading(true);
      try {
        console.log('📡 [PizarraPermissionRequests] Buscando solicitudes pendientes para ownerId:', currentUserNumericId);
        const pending = await repo.getPendingRequests(currentUserNumericId);
        console.log('📋 [PizarraPermissionRequests] Solicitudes pendientes encontradas:', pending.length, pending);
        
        // También cargar permisos otorgados
        const granted = await repo.getGrantedPermissions(currentUserNumericId);
        console.log('📋 [PizarraPermissionRequests] Permisos otorgados encontrados:', granted.length, granted);
        
        // Combinar ambas listas
        const allRequests = [...pending, ...granted];
        console.log('📋 [PizarraPermissionRequests] Total de solicitudes/permisos:', allRequests.length);
        setRequests(allRequests);

        // Cargar información de los usuarios que solicitan
        const allUserIds = allRequests.map(r => r.id_usuario_editor);
        if (allUserIds.length > 0) {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          const { data, error } = await supabase
            .from('usuario')
            .select('id, nombre, username, correo, avatar')
            .in('id', allUserIds);

          console.log('👥 [PizarraPermissionRequests] Resultado consulta usuarios:', {
            data,
            error: error?.message,
            userIds: allUserIds,
            rawData: JSON.stringify(data, null, 2)
          });

          if (data && !error) {
            const usersMap = new Map<number, UserInfo>();
            data.forEach((u: any) => {
              const userId = parseInt(String(u.id));
              const userInfo = {
                id: userId,
                nombre: u.nombre || u.username || u.correo || 'Usuario',
                avatar: u.avatar
              };
              
              console.log('👤 [PizarraPermissionRequests] Procesando usuario:', {
                userId,
                originalData: u,
                processedInfo: userInfo
              });
              
              usersMap.set(userId, userInfo);
            });
            
            console.log('👥 [PizarraPermissionRequests] Mapa final de usuarios:', usersMap);
            setUsersInfo(usersMap);
          } else {
            console.error('❌ [PizarraPermissionRequests] Error cargando usuarios:', error);
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
  }, [currentUserNumericId]);

  // Otorgar permiso
  const handleGrant = async (request: PizarraPermission) => {
    if (!currentUserNumericId) return;

    try {
      const updatedPermission = await repo.updatePermission(currentUserNumericId, request.id_usuario_editor, {
        granted: true
      });

      if (updatedPermission) {
        // Actualizar la solicitud en la lista local en lugar de eliminarla
        setRequests(prev => prev.map(r => 
          r.id === request.id ? { ...r, granted: true, granted_at: updatedPermission.granted_at } : r
        ));
      }
    } catch (error) {
      console.error('Error otorgando permiso:', error);
    }
  };

  // Revocar permiso (cambiar de otorgado a pendiente)
  const handleRevoke = async (request: PizarraPermission) => {
    if (!currentUserNumericId) return;

    try {
      const updatedPermission = await repo.updatePermission(currentUserNumericId, request.id_usuario_editor, {
        granted: false,
        granted_at: null
      });

      if (updatedPermission) {
        // Actualizar la solicitud en la lista local
        setRequests(prev => prev.map(r => 
          r.id === request.id ? { ...r, granted: false, granted_at: null } : r
        ));
      }
    } catch (error) {
      console.error('Error revocando permiso:', error);
    }
  };

  // Rechazar solicitud (eliminar completamente)
  const handleReject = async (request: PizarraPermission) => {
    if (!currentUserNumericId) return;

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

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
      {/* Badge de notificación */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className={`${
            requests.filter(r => !r.granted).length > 0 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : 'bg-gray-500 hover:bg-gray-600'
          } text-white rounded-lg px-3 py-2 shadow-lg transition-all duration-200 flex items-center gap-2`}
        >
          <Users className="w-5 h-5" />
          <span className="text-sm font-medium">Permisos</span>
          {requests.filter(r => !r.granted).length > 0 && (
            <div className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
              {requests.filter(r => !r.granted).length}
            </div>
          )}
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
                Permisos de Pizarra
                {requests.filter(r => !r.granted).length > 0 && 
                  ` (${requests.filter(r => !r.granted).length} pendientes)`
                }
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
            {requests.length > 0 ? (
              requests.map(request => {
                const userInfo = usersInfo.get(request.id_usuario_editor);
                const isGranted = request.granted;
                
                return (
                  <div
                    key={request.id}
                    className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      isGranted ? 'bg-green-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          isGranted ? 'bg-green-500' : 'bg-blue-500'
                        }`}>
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
                            {isGranted 
                              ? 'Tiene permiso para editar tu pizarra' 
                              : 'Solicita editar tu pizarra'
                            }
                          </p>
                          {isGranted && request.granted_at && (
                            <p className="text-xs text-green-600">
                              Otorgado el {new Date(request.granted_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {isGranted ? (
                          // Solo botón eliminar para permisos otorgados
                          <button
                            onClick={() => handleReject(request)}
                            className="bg-red-600 hover:bg-red-700 text-white rounded-lg p-2 transition-colors"
                            title="Eliminar permiso"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        ) : (
                          // Botones para solicitudes pendientes
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-4xl mb-3">👥</div>
                <p className="text-gray-500 font-medium">No hay solicitudes ni permisos</p>
                <p className="text-sm text-gray-400 mt-1">
                  Cuando alguien solicite editar tu pizarra, aparecerá aquí
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
