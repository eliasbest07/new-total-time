'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import { useRef } from 'react';
import { ArrowLeft, Edit3, Clock, CheckCircle, History, Calendar } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePizarraPermissions } from '@/hooks/usePizarraPermissions';
import InputArea from '@/app/components/mainUI/InputArea';
import Ventana from '@/app/demo/components/Ventana';

export default function PizarraUsuarioPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const pizarraRef = useRef<PizarraRef>(null);
  const [userName, setUserName] = useState<string>('Usuario');
  const [ownerNumericId, setOwnerNumericId] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historialPizarras, setHistorialPizarras] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { usuario } = useAuth();

  // Debug: Verificar qué viene en los params
  useEffect(() => {
    console.log('🔍 [DEBUG] Params completos:', params);
    console.log('🔍 [DEBUG] userId extraído:', userId);
    console.log('🔍 [DEBUG] Tipo de userId:', typeof userId);
    console.log('🔍 [DEBUG] userId es undefined?', userId === undefined);
    console.log('🔍 [DEBUG] userId es null?', userId === null);
    console.log('🔍 [DEBUG] userId length:', userId?.length);
  }, [params, userId]);

  // Hook para manejar permisos
  // LOG CRÍTICO: Ver exactamente qué es usuario.id
  console.log('🔴 [CRÍTICO] usuario completo:', {
    id: usuario?.id,
    idType: typeof usuario?.id,
    userAuth: usuario?.userAuth,
    email: usuario?.email,
    profile: usuario?.profile
  });

  const currentEditorId = usuario?.id ? parseInt(usuario.id) : null;

  console.log('🔴 [CRÍTICO] Conversión:', {
    usuarioId: usuario?.id,
    parseInt: parseInt(usuario?.id || '0'),
    currentEditorId,
    isNaN: currentEditorId ? isNaN(currentEditorId) : 'null'
  });

  const {
    hasPermission,
    isPending,
    loading: permissionLoading,
    requestPermission
  } = usePizarraPermissions(
    ownerNumericId,
    currentEditorId
  );

  // Log para debugging de permisos
  useEffect(() => {
    console.table({
      'Owner ID (numérico)': ownerNumericId,
      'Owner ID Type': typeof ownerNumericId,
      'Usuario ID (string)': usuario?.id,
      'Usuario ID Type': typeof usuario?.id,
      'Current Editor ID': currentEditorId,
      'Editor ID Type': typeof currentEditorId,
      'Has Permission': hasPermission,
      'Is Pending': isPending,
      'Permission Loading': permissionLoading
    });

    console.log('🔍 [Page] Valores RAW:', {
      ownerNumericId,
      'usuario.id': usuario?.id,
      currentEditorId,
      'parseInt(usuario.id)': usuario?.id ? parseInt(usuario.id) : 'N/A'
    });
  }, [ownerNumericId, usuario?.id, currentEditorId, hasPermission, isPending, permissionLoading]);

  // Cargar historial de pizarras
  const loadHistorialPizarras = async () => {
    if (!userId) return;

    setLoadingHistory(true);
    try {
      const { SupabasePizarraRepository } = await import('@/infrastructure/datasource/SupabasePizarraRepository');
      const pizarraRepo = new SupabasePizarraRepository();

      const pizarras = await pizarraRepo.getUltimasPizarras(userId, 30); // Últimas 30 pizarras
      setHistorialPizarras(pizarras);
      console.log('📊 Historial de pizarras cargado:', pizarras.length);
    } catch (error) {
      console.error('❌ Error cargando historial:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Cargar historial al abrir el modal
  useEffect(() => {
    if (showHistoryModal && historialPizarras.length === 0) {
      loadHistorialPizarras();
    }
  }, [showHistoryModal]);

  // Cargar información del usuario desde Supabase
  useEffect(() => {
    const loadUserInfo = async () => {
      console.log('🔍 [Page] loadUserInfo iniciado');
      console.log('🔍 [Page] userId antes de la query:', userId);
      console.log('🔍 [Page] userId type:', typeof userId);
      console.log('🔍 [Page] userId es truthy?', !!userId);

      if (!userId) {
        console.warn('⚠️ [Page] userId está vacío, no se ejecutará la query');
        return;
      }

      try {
        console.log('🔍 [Page] Buscando usuario con id_usuario:', userId);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        console.log('🔍 [Page] Supabase client obtenido, ejecutando query...');
        const { data, error } = await supabase
          .from('usuario')
          .select('id, nombre, username, correo, id_usuario')
          .eq('id_usuario', userId)
          .maybeSingle();

        console.log('🔍 [Page] Query ejecutada. Data:', data, 'Error:', error);

        if (error) {
          console.error('❌ [Page] Error cargando información del usuario:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: userId,
            errorCompleto: JSON.stringify(error)
          });
          return;
        }

        if (data) {
          console.log('✅ [Page] Usuario encontrado:', {
            id: data.id,
            nombre: data.nombre || data.username,
            id_usuario: data.id_usuario
          });
          setUserName(data.nombre || data.username || data.correo || 'Usuario');
          setOwnerNumericId(parseInt(data.id));
        } else {
          console.warn('⚠️ [Page] No hay error pero tampoco hay data');
        }
      } catch (error) {
        console.error('❌ [Page] Error en loadUserInfo (catch):', error);
      }
    };

    console.log('🔍 [Page] useEffect ejecutándose con userId:', userId);
    if (userId) {
      loadUserInfo();
    } else {
      console.warn('⚠️ [Page] useEffect: userId es falsy, no se carga nada');
    }
  }, [userId]);

  // Si no hay usuario logueado, mostrar mensaje
  if (!usuario) {
    return (
      <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-lg shadow-lg text-white">
          <h2 className="text-2xl font-semibold mb-2">Cargando...</h2>
          <p className="text-white/70">Verificando autenticación</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Header con botón de regreso y controles */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-lg transition-all duration-200 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
            <h1 className="text-white font-semibold text-lg">
              Pizarra de {userName}
            </h1>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3">
          {/* Botón de historial - Siempre visible */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
          >
            <History className="w-5 h-5" />
            <span>Ver Historial</span>
          </button>

          {/* Botón de solicitud de permiso */}
          {!hasPermission && !isPending && (
            <>
              {!ownerNumericId || !currentEditorId ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg shadow-lg">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="font-medium">Cargando información...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    console.log('🔍 [Botón] Datos al solicitar permiso:', {
                      ownerNumericId,
                      ownerNumericIdType: typeof ownerNumericId,
                      usuarioId: usuario?.id,
                      currentEditorId,
                      currentEditorIdType: typeof currentEditorId,
                      userId,
                    });
                    requestPermission();
                  }}
                  disabled={permissionLoading || !currentEditorId}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
                >
                  <Edit3 className="w-5 h-5" />
                  <span>Solicitar Permiso de Edición</span>
                </button>
              )}
            </>
          )}

          {isPending && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-lg">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-medium">Solicitud Pendiente</span>
            </div>
          )}

          {hasPermission && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Permiso de Edición Otorgado</span>
            </div>
          )}
        </div>
      </div>

      {/* Pizarra del usuario - modo solo lectura */}
      <div className="w-full h-full">
        <Pizarra
          ref={pizarraRef}
          storagePrefix={`user-${userId}`}
          viewingUserId={userId}
          onShowScreenshots={() => {}}
        />
      </div>

      {/* InputArea - Solo si tiene permiso */}
      {hasPermission && (
        <InputArea
          onCreateNote={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addNoteCard(text);
            }
          }}
          onCreateTodoList={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addTodoCard(text);
            }
          }}
          onSendToUser={(text, user) => {
            // Implementar envío a chat si es necesario
            console.log('Enviar a usuario:', user, text);
          }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          placeholder="Escribe aquí para crear notas, tareas o enviar..."
        />
      )}

      {/* Info flotante */}
      <div className="absolute bottom-4 right-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
        <p className="text-white text-sm">
          {hasPermission
            ? 'Vista de pizarra compartida - Modo edición'
            : 'Vista de pizarra compartida - Solo lectura'}
        </p>
      </div>

      {/* Modal de Historial de Pizarras */}
      <Ventana
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={`Historial de Pizarras de ${userName}`}
        initialWidth={900}
        initialHeight={600}
        minWidth={700}
        minHeight={500}
        showOverlay={true}
      >
        <div className="p-6">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-600">Cargando historial...</p>
              </div>
            </div>
          ) : historialPizarras.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <History className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg font-medium">No hay pizarras en el historial</p>
              <p className="text-gray-400 text-sm">Este usuario aún no tiene pizarras guardadas</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {historialPizarras.length} pizarra{historialPizarras.length !== 1 ? 's' : ''} encontrada{historialPizarras.length !== 1 ? 's' : ''}
                </h3>
                <button
                  onClick={loadHistorialPizarras}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Actualizar
                </button>
              </div>

              <div className="grid gap-3 max-h-96 overflow-y-auto">
                {historialPizarras.map((pizarra) => (
                  <div
                    key={pizarra.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(pizarra.created_at).toLocaleString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p>ID: {pizarra.id}</p>
                          {pizarra.updated_at && (
                            <p>Última actualización: {new Date(pizarra.updated_at).toLocaleString('es-ES')}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (pizarraRef.current?.loadPizarraById) {
                            try {
                              await pizarraRef.current.loadPizarraById(pizarra.id);
                              setShowHistoryModal(false);
                              console.log('✅ Pizarra cargada:', pizarra.id);
                            } catch (error) {
                              console.error('❌ Error cargando pizarra:', error);
                              alert('Error al cargar la pizarra');
                            }
                          }
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Cargar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Ventana>
    </div>
  );
}
