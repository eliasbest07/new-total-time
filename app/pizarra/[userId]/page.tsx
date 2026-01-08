'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import { useRef } from 'react';
import { ArrowLeft, History, Calendar, ChevronDown, Target, CalendarDays, Link2, Plus, Lock, Send, Clock } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import InputArea from '@/app/components/mainUI/InputArea';
import Ventana from '@/app/demo/components/Ventana';
import { useMisiones } from '@/hooks/useMisiones';
import { useActividades } from '@/hooks/useActividades';
import { Recurso } from '@/domain/entities/Recurso';
import { usePizarraPermissions } from '@/hooks/usePizarraPermissions';

interface PizarraHistorial {
  id: string;
  created_at: string;
  updated_at?: string;
}

export default function PizarraUsuarioPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const pizarraRef = useRef<PizarraRef>(null);
  const [userName, setUserName] = useState<string>('Usuario');
  const [userNumericId, setUserNumericId] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historialPizarras, setHistorialPizarras] = useState<PizarraHistorial[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { usuario } = useAuth();
  const [mensajeEnviado, setMensajeEnviado] = useState(false);
  const [currentUserNumericId, setCurrentUserNumericId] = useState<number | null>(null);

  // Hook de permisos - usa IDs numéricos
  const {
    hasPermission,
    isPending,
    loading: loadingPermission,
    requestPermission
  } = usePizarraPermissions(userNumericId, currentUserNumericId);

  // Estados para el panel de agregar elementos
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'misiones' | 'actividades' | 'recursos'>('misiones');

  // Estados para recursos
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loadingRecursos, setLoadingRecursos] = useState(false);
  const [recursosPage, setRecursosPage] = useState(0);
  const RECURSOS_PER_PAGE = 5;

  // Hooks para cargar datos del usuario de la pizarra
  const { misiones, loading: loadingMisiones } = useMisiones(userNumericId, { enableRealtime: false });
  const { actividades, loading: loadingActividades } = useActividades(userId);

  // Cargar recursos del usuario
  useEffect(() => {
    const loadRecursos = async () => {
      if (!userId) return;

      setLoadingRecursos(true);
      try {
        const { SupabaseRecursoRepository } = await import('@/infrastructure/datasource/SupabaseRecursoRepository');
        const recursoRepo = new SupabaseRecursoRepository();
        const recursosData = await recursoRepo.getRecursosByUsuario(userId);
        setRecursos(recursosData);
      } catch (error) {
        console.error('Error cargando recursos:', error);
      } finally {
        setLoadingRecursos(false);
      }
    };

    loadRecursos();
  }, [userId]);

  // Cargar historial de pizarras
  const loadHistorialPizarras = async () => {
    if (!userId) return;

    setLoadingHistory(true);
    try {
      const { SupabasePizarraRepository } = await import('@/infrastructure/datasource/SupabasePizarraRepository');
      const pizarraRepo = new SupabasePizarraRepository();
      const pizarras = await pizarraRepo.getUltimasPizarras(userId, 30);
      setHistorialPizarras(pizarras);
    } catch (error) {
      console.error('Error cargando historial:', error);
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
      if (!userId) return;

      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data, error } = await supabase
          .from('usuario')
          .select('id, nombre, username, correo, id_usuario')
          .eq('id_usuario', userId)
          .maybeSingle();

        if (error) {
          console.error('Error cargando información del usuario:', error);
          return;
        }

        if (data) {
          setUserName(data.nombre || data.username || data.correo || 'Usuario');
          setUserNumericId(parseInt(data.id));
        }
      } catch (error) {
        console.error('Error en loadUserInfo:', error);
      }
    };

    if (userId) {
      loadUserInfo();
    }
  }, [userId]);

  // Cargar ID numérico del usuario actual (el logueado)
  useEffect(() => {
    const loadCurrentUserNumericId = async () => {
      if (!usuario?.userAuth) return;

      try {
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');
        const { data, error } = await supabase
          .from('usuario')
          .select('id')
          .eq('id_usuario', usuario.userAuth)
          .maybeSingle();

        if (!error && data) {
          setCurrentUserNumericId(parseInt(data.id));
        }
      } catch (error) {
        console.error('Error cargando ID numérico del usuario actual:', error);
      }
    };

    loadCurrentUserNumericId();
  }, [usuario?.userAuth]);

  // Enviar mensaje automático al entrar a la pizarra
  useEffect(() => {
    const enviarMensajeAutomatico = async () => {
      if (!usuario?.userAuth || !userId || mensajeEnviado) return;
      if (usuario.userAuth === userId) return;

      try {
        const { SupabaseMensajeRepository } = await import('@/infrastructure/datasource/SupabaseMensajeRepository');
        const mensajeRepo = new SupabaseMensajeRepository();
        const mensaje = await mensajeRepo.enviarMensaje(
          usuario.userAuth,
          userId,
          '~actualizapirazza'
        );
        if (mensaje) {
          setMensajeEnviado(true);
        }
      } catch (error) {
        console.error('Error enviando mensaje automático:', error);
      }
    };

    enviarMensajeAutomatico();
  }, [usuario?.userAuth, userId, mensajeEnviado]);

  // Función para agregar misión a la pizarra
  const handleAddMision = (mision: any) => {
    if (pizarraRef.current?.addMisionCard) {
      pizarraRef.current.addMisionCard({
        id_mision: mision.id,
        title: mision.nombre || 'Sin nombre',
        description: mision.descripcion || '',
        hours: mision.horas || 0,
        id_usuario: mision.id_usuario,
        id_creador: mision.id_creador
      });
    }
  };

  // Función para agregar actividad a la pizarra (usando restoreCard)
  const handleAddActividad = (actividad: any) => {
    if (pizarraRef.current?.restoreCard) {
      const cardId = `actividad-${actividad.id}-${Date.now()}`;
      pizarraRef.current.restoreCard({
        id: cardId,
        type: 'actividad',
        title: actividad.descripcion || 'Actividad',
        content: actividad.descripcion || '',
        x: 200 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: 280,
        height: 180,
        fontSize: 14,
        zIndex: 1000,
        activityData: {
          id_actividad: actividad.id,
          subject: actividad.descripcion || '',
          participants: [],
          date: actividad.fecha,
          time: actividad.hora_inicio,
          duration: (actividad.cant_horas || 0) * 60,
          isRunning: false,
          timeLeft: (actividad.tiempo_dedicado || 0)
        }
      });
    }
  };

  // Función para agregar recurso a la pizarra
  const handleAddRecurso = (recurso: Recurso) => {
    if (pizarraRef.current?.restoreCard) {
      const cardId = `recurso-${recurso.id}-${Date.now()}`;
      pizarraRef.current.restoreCard({
        id: cardId,
        type: 'resource',
        title: recurso.nombre || 'Recurso',
        content: recurso.link || '',
        x: 200 + Math.random() * 100,
        y: 200 + Math.random() * 100,
        width: 250,
        height: 120,
        fontSize: 14,
        zIndex: 1000,
        recursoData: {
          id: recurso.id,
          name: recurso.nombre || 'Recurso',
          resourceType: 'link',
          url: recurso.link,
          icon: recurso.icono,
          color: 'bg-orange-500'
        }
      });
    }
  };

  // Determinar si es la pizarra propia (no necesita permiso)
  const isOwnPizarra = usuario?.userAuth === userId;

  // Determinar si puede editar: es su propia pizarra O tiene permiso otorgado
  const canEdit = isOwnPizarra || hasPermission;

  // Solo lectura si no puede editar
  const isReadOnly = !canEdit;

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
          {/* Mostrar controles de edición solo si puede editar */}
          {canEdit ? (
            <>
              {/* Botón para agregar elementos */}
              <button
                onClick={() => setShowAddPanel(!showAddPanel)}
                className={`flex items-center gap-2 px-4 py-2 ${showAddPanel ? 'bg-green-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded-lg transition-all duration-200 shadow-lg font-medium`}
              >
                <Plus className="w-5 h-5" />
                <span>Agregar</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAddPanel ? 'rotate-180' : ''}`} />
              </button>
            </>
          ) : (
            <>
              {/* Botón de solicitar permiso o estado pendiente */}
              {isPending ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/80 text-white rounded-lg shadow-lg font-medium">
                  <Clock className="w-5 h-5" />
                  <span>Solicitud pendiente</span>
                </div>
              ) : (
                <button
                  onClick={requestPermission}
                  disabled={loadingPermission}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg font-medium disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                  <span>Solicitar permiso de edición</span>
                </button>
              )}
              {/* Indicador de solo lectura */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white/80 rounded-lg shadow-lg">
                <Lock className="w-4 h-4" />
                <span className="text-sm">Solo lectura</span>
              </div>
            </>
          )}

          {/* Botón de historial */}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
          >
            <History className="w-5 h-5" />
            <span>Ver Historial</span>
          </button>
        </div>
      </div>

      {/* Panel para agregar elementos - solo si puede editar */}
      {canEdit && showAddPanel && (
        <div className="absolute top-20 right-4 z-50 w-80 bg-white/95 backdrop-blur-md rounded-lg shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('misiones')}
              className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === 'misiones' ? 'bg-green-50 text-green-700 border-b-2 border-green-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Target className="w-4 h-4" />
              Misiones
            </button>
            <button
              onClick={() => setActiveTab('actividades')}
              className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === 'actividades' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Actividades
            </button>
            <button
              onClick={() => setActiveTab('recursos')}
              className={`flex-1 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
                activeTab === 'recursos' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Recursos
            </button>
          </div>

          {/* Contenido */}
          <div className="max-h-80 overflow-y-auto p-3">
            {activeTab === 'misiones' && (
              <div className="space-y-2">
                {loadingMisiones ? (
                  <div className="text-center py-4 text-gray-500">Cargando misiones...</div>
                ) : misiones.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No hay misiones disponibles</div>
                ) : (
                  misiones.map((mision) => (
                    <button
                      key={mision.id}
                      onClick={() => handleAddMision(mision)}
                      className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                    >
                      <div className="font-medium text-green-800 text-sm">{mision.nombre || 'Sin nombre'}</div>
                      {mision.descripcion && (
                        <div className="text-xs text-green-600 mt-1 line-clamp-2">{mision.descripcion}</div>
                      )}
                      {mision.horas && (
                        <div className="text-xs text-green-500 mt-1">{mision.horas}h estimadas</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'actividades' && (
              <div className="space-y-2">
                {loadingActividades ? (
                  <div className="text-center py-4 text-gray-500">Cargando actividades...</div>
                ) : actividades.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No hay actividades disponibles</div>
                ) : (
                  actividades.map((actividad) => (
                    <button
                      key={actividad.id}
                      onClick={() => handleAddActividad(actividad)}
                      className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                    >
                      <div className="font-medium text-blue-800 text-sm">{actividad.descripcion || 'Sin descripción'}</div>
                      {actividad.fecha && (
                        <div className="text-xs text-blue-600 mt-1">
                          {new Date(actividad.fecha).toLocaleDateString('es-ES')}
                          {actividad.hora_inicio && ` - ${actividad.hora_inicio}`}
                        </div>
                      )}
                      {actividad.cant_horas && (
                        <div className="text-xs text-blue-500 mt-1">{actividad.cant_horas}h</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {activeTab === 'recursos' && (
              <div className="space-y-2">
                {loadingRecursos ? (
                  <div className="text-center py-4 text-gray-500">Cargando recursos...</div>
                ) : recursos.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">No hay recursos disponibles</div>
                ) : (
                  <>
                    {recursos
                      .slice(recursosPage * RECURSOS_PER_PAGE, (recursosPage + 1) * RECURSOS_PER_PAGE)
                      .map((recurso) => (
                        <button
                          key={recurso.id}
                          onClick={() => handleAddRecurso(recurso)}
                          className="w-full text-left p-3 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
                        >
                          <div className="flex items-center gap-2">
                            {recurso.icono && <span className="text-lg">{recurso.icono}</span>}
                            <div className="font-medium text-orange-800 text-sm">{recurso.nombre || 'Sin nombre'}</div>
                          </div>
                          {recurso.link && (
                            <div className="text-xs text-orange-600 mt-1 truncate">{recurso.link}</div>
                          )}
                        </button>
                      ))}

                    {/* Paginación */}
                    {recursos.length > RECURSOS_PER_PAGE && (
                      <div className="flex items-center justify-between pt-2 border-t border-orange-200 mt-2">
                        <button
                          onClick={() => setRecursosPage(p => Math.max(0, p - 1))}
                          disabled={recursosPage === 0}
                          className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          Anterior
                        </button>
                        <span className="text-xs text-gray-500">
                          {recursosPage + 1} / {Math.ceil(recursos.length / RECURSOS_PER_PAGE)}
                        </span>
                        <button
                          onClick={() => setRecursosPage(p => Math.min(Math.ceil(recursos.length / RECURSOS_PER_PAGE) - 1, p + 1))}
                          disabled={recursosPage >= Math.ceil(recursos.length / RECURSOS_PER_PAGE) - 1}
                          className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          Siguiente
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pizarra del usuario */}
      <div className="w-full h-full">
        <Pizarra
          fullMode={true}
          ref={pizarraRef}
          storagePrefix={`user-${userId}`}
          viewingUserId={userId}
          onShowScreenshots={() => {}}
          readOnly={isReadOnly}
        />
      </div>

      {/* InputArea - Solo visible si puede editar */}
      {canEdit && (
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
            console.log('Enviar a usuario:', user, text);
          }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          placeholder="Escribe aquí para crear notas o tareas en esta pizarra..."
        />
      )}

      {/* Info flotante */}
      <div className="absolute bottom-4 right-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
        <p className="text-white text-sm">
          {canEdit
            ? `Pizarra de ${userName} - Puedes agregar notas y tareas`
            : `Pizarra de ${userName} - Modo solo lectura`
          }
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
                            } catch (error) {
                              console.error('Error cargando pizarra:', error);
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
