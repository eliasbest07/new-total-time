"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState, useMemo, useEffect } from "react";
import Ventana from "@/app/demo/components/Ventana";
import { useScreenshots } from "@/hooks/useScreenshots";

import Perfil from "@/app/components/mainUI/Perfil";
import RelojActual from "@/app/components/mainUI/RelojActual";
import Salas from "@/app/components/mainUI/Salas";
import { ChevronRight } from "lucide-react";
import Cube from "./mainUI/cubo-acordion-carga";
import Accordion from "../demo/components/Accordion";
import { Resource } from "../demo/utils/resourceUtils";
import ChatWindow from "./ChatWindow";
import ProyectoWindow from "./ProyectoWindow";
import ActividadesGrid from "../demo/components/ActividadesGrid";
import MisionesCompact from "./mainUI/MisionesCompact";
import { useRecursos } from "@/hooks/useRecursos";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuariosOrganizacion } from "@/hooks/useUsuariosOrganizacion";
import { useAuth } from "@/app/contexts/AuthContext";
import { FileText, Link, Code, Image, Video, Download, LucideIcon } from "lucide-react";
import AgregarRecursoModal from "./modals/AgregarRecursoModal";
import { Actividad } from "@/domain/entities/Actividad";
import { Mision } from "@/domain/entities/Mision";
import MisionCard from "../demo/components/MisionCard";
import InputArea from "./mainUI/InputArea";
import { useChartHistory, BoardHistorySnapshot } from "@/hooks/useChartHistory";


export default function MainScreen() {
  const pizarraRef = useRef<PizarraRef>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [recursos, setRecursos] = useState<Resource[]>([]);
  const [showActividadDetails, setShowActividadDetails] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showScreenshotsModal, setShowScreenshotsModal] = useState<string | null>(null);
  const [selectedActividad, setSelectedActividad] = useState<Actividad | null>(null);
  const [showMisionDetails, setShowMisionDetails] = useState(false);
  const [selectedMision, setSelectedMision] = useState<Mision | null>(null);
  const [showMisionChat, setShowMisionChat] = useState(false);
  const [misionChatMessage, setMisionChatMessage] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistorySnapshot, setSelectedHistorySnapshot] = useState<BoardHistorySnapshot | null>(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<{
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  } | null>(null);
  const [showProyectoWindow, setShowProyectoWindow] = useState(false);
  const [selectedProyectoWindow, setSelectedProyectoWindow] = useState<import('@/domain/entities/Proyecto').Proyecto | null>(null);

  const { usuario } = useAuth();
  
  // Delays escalonados para evitar múltiples peticiones simultáneas
  const [enableHooks, setEnableHooks] = useState(false);
  
  useEffect(() => {
    if (usuario) {
      // Delay antes de habilitar todos los hooks
      const timer = setTimeout(() => {
        setEnableHooks(true);
      }, 1000); // 1 segundo de delay
      
      return () => clearTimeout(timer);
    } else {
      setEnableHooks(false);
    }
  }, [usuario]);

  // Hooks con delays escalonados para evitar 429
  const { recursos: recursosSupabase, loading: recursosLoading } = useRecursos(
    enableHooks ? usuario?.id || null : null
  );
  
  const { proyectos: proyectosSupabase, loading: proyectosLoading } = useProyectos();
  
  const { usuarios: usuariosOrganizacion, loading: usuariosLoading } = useUsuariosOrganizacion(
    enableHooks ? usuario?.idOrganizacion || null : null
  );
  
  // Hook para datos del chart con delay adicional
  const { 
    historyData: previousDayBoardHistory, 
    chartBarHeights, 
    chartMaxHeight,
    loading: chartLoading,
    error: chartError
  } = useChartHistory(enableHooks ? usuario?.id || null : null);

  // Filtrar usuarios de la organización excluyendo al usuario actual
  const usuariosFiltrados = useMemo(() => {
    console.log('🔍 Filtrado de usuarios - Usuario actual:', {
      id: usuario?.id,
      userAuth: usuario?.userAuth,
      nombre: usuario?.getNombreCompleto(),
      email: usuario?.email
    });

    console.log('🔍 Filtrado de usuarios - Todos los usuarios de la organización:',
      usuariosOrganizacion.map(u => ({
        id: u.id,
        userAuth: u.userAuth,
        nombre: u.getNombreCompleto(),
        email: u.email
      }))
    );

    if (!usuario) return usuariosOrganizacion;

    const filtrados = usuariosOrganizacion.filter(u => {
      // Comparar por email ya que los IDs pueden ser diferentes (uno es userAuth UUID, otro es id de tabla)
      const esDiferente = u.email !== usuario.email;
      console.log(`🔍 Comparando ${u.getNombreCompleto()} (email: ${u.email}) con usuario actual (email: ${usuario.email}): ${esDiferente ? 'INCLUIR' : 'EXCLUIR'}`);
      return esDiferente;
    });

    console.log('🔍 Usuarios filtrados (resultado final):',
      filtrados.map(u => ({
        id: u.id,
        nombre: u.getNombreCompleto(),
        email: u.email
      }))
    );

    return filtrados;
  }, [usuariosOrganizacion, usuario]);

  // Hook para screenshots con delay
  const {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearScreenshots,
    clearScreenshotsByBloque,
    reloadScreenshots,
    error: screenshotError
  } = useScreenshots();

  // Función para convertir recursos de Supabase al formato del Accordion
  const convertirRecursosSupabase = () => {
    return recursosSupabase.map((recurso, index) => ({
      id: recurso.id,
      name: recurso.nombre || 'Sin nombre',
      icon: getIconForRecurso(recurso.icono),
      color: getColorForRecurso(index),
      type: 'link',
      url: recurso.link || undefined,
      description: `Recurso creado el ${new Date(recurso.created_at).toLocaleDateString()}`
    }));
  };

  // Función para obtener icono basado en el icono del recurso
  const getIconForRecurso = (icono: string | null) => {
    if (!icono) return FileText;

    // Si es un emoji, usar FileText como fallback
    if (icono.length <= 2) return FileText;

    // Mapear algunos tipos comunes
    const iconMap: { [key: string]: LucideIcon } = {
      'link': Link,
      'code': Code,
      'image': Image,
      'video': Video,
      'download': Download,
      'file': FileText
    };

    return iconMap[icono.toLowerCase()] || FileText;
  };

  // Función para obtener color basado en el índice
  const getColorForRecurso = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-red-500',
      'bg-yellow-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  // Actualizar recursos cuando cambien los de Supabase
  useEffect(() => {
    console.log('📚 MainScreen - Estado recursos:', {
      usuario: usuario?.id,
      recursosLoading,
      recursosSupabaseLength: recursosSupabase?.length,
      recursosSupabase
    });


     const meta = document.querySelector("meta[name='viewport']");
    const original = meta?.getAttribute("content");
    meta?.setAttribute("content", "width=device-width, initial-scale=0.7"); // zoom out
    return () => {
      //if (original) meta?.setAttribute("content", original);
    };

    if (!recursosLoading && recursosSupabase) {
      console.log('📚 MainScreen - Convirtiendo recursos:', recursosSupabase);
      const recursosConvertidos = convertirRecursosSupabase();
      console.log('📚 MainScreen - Recursos convertidos:', recursosConvertidos);
      setRecursos(recursosConvertidos);
    }
  }, [recursosSupabase, recursosLoading]);

  // Log para proyectos
  useEffect(() => {
    console.log('📁 MainScreen - Estado proyectos:', {
      usuario: usuario?.id,
      proyectosLoading,
      proyectosSupabaseLength: proyectosSupabase?.length,
      proyectosSupabase
    });
  }, [proyectosSupabase, proyectosLoading]);

  // Log para usuarios de organización
  useEffect(() => {
    console.log('👥 MainScreen - Estado usuarios organización:', {
      usuario: usuario?.id,
      organizacion: usuario?.idOrganizacion,
      usuariosLoading,
      usuariosOrganizacionLength: usuariosOrganizacion?.length,
      usuariosOrganizacion
    });
  }, [usuariosOrganizacion, usuariosLoading]);

  const handleAddResource = (): void => {
    setShowAddResourceModal(true);
  };



  // Función para manejar la apertura de screenshots
  const handleShowScreenshots = (cardId: string) => {
    setShowScreenshotsModal(cardId);
  };

  // Función para manejar la apertura de detalles de actividad
  const handleShowActividadDetails = (actividad: Actividad) => {
    setSelectedActividad(actividad);
    setShowActividadDetails(true);
  };

  // Función para manejar la apertura de detalles de misión
  const handleShowMisionDetails = (mision: Mision) => {
    setSelectedMision(mision);
    setShowMisionDetails(true);
  };

  // Función para manejar el clic en las barras del chart
  const handleChartBarClick = (snapshot: BoardHistorySnapshot): void => {
    setSelectedHistorySnapshot(snapshot);
    setShowHistoryModal(true);
  };

  // Funciones para formatear fecha y hora de actividades
  const formatDate = (fecha: string | null) => {
    if (!fecha) return 'Sin fecha';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (horaInicio: string | null) => {
    if (!horaInicio) return 'Sin hora';

    try {
      const date = new Date(horaInicio);

      if (isNaN(date.getTime())) {
        return '00:00';
      }

      const formatted = date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      return formatted;
    } catch (error) {
      return horaInicio;
    }
  };

  // Handler para cuando se hace click en un usuario
  const handleUserClick = (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }) => {
    setSelectedChatUser(userData);
    setShowChatWindow(true);
  };

  // Handler para cuando se hace click en un proyecto
  const handleProyectoClick = (proyecto: import('@/domain/entities/Proyecto').Proyecto) => {
    setSelectedProyectoWindow(proyecto);
    setShowProyectoWindow(true);
  };

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}>

      <div className="absolute inset-0" style={{ zIndex: 10 }}>
        <Pizarra ref={pizarraRef} onShowScreenshots={handleShowScreenshots} storagePrefix="real" />
      </div>

      {/* estos dos componentes abajo estan dentro de demo, tiene que estar afuera para ser usados en cualquier parte */}
      <div className="mb-8 px-2 z-30 pointer-events-auto w-fit">
        <Perfil
          showPizarraControls={true}
          onClearStorage={() => pizarraRef.current?.clearStorage?.()}
          onExportJSON={() => pizarraRef.current?.exportStorage?.()}
          onImportJSON={(content) => pizarraRef.current?.importStorage?.(content)}
          onSaveToSupabase={async () => {
            const success = await pizarraRef.current?.saveToSupabase?.();
            if (success) {
              alert('✅ Pizarra guardada exitosamente en Supabase');
            } else {
              alert('❌ Error al guardar la pizarra en Supabase');
            }
          }}
          onLoadFromSupabase={async () => {
            await pizarraRef.current?.loadFromSupabase?.();
            alert('✅ Pizarra cargada desde Supabase');
          }}
        />
      </div>

      <div className="pointer-events-auto " style={{ position: 'absolute', top: '0.5rem', left: '9rem', zIndex: 30 }}>
        <RelojActual />
      </div>

      <Salas />

      <div className="fixed top-18 z-30 flex items-center transition-all duration-300">
        {/* Botón expandir o contraer*/}
        <button
          onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          className={`p-1 py-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-lg 
            transition-all duration-300 text-white fixed top-18
            ${rightPanelCollapsed ? 'right-38' : 'right-78'}`}
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-300 ${rightPanelCollapsed ? 'rotate-180' : ''
              }`}
          />
        </button>

        {/* Cubo */}
        {rightPanelCollapsed && (
          <div className="fixed top-18 right-0">
            <Cube />
          </div>
        )}
      </div>

      <div className={`fixed top-0 right-0 h-auto flex flex-col transition-all duration-300 z-30 ${rightPanelCollapsed ? "w-0" : "w-80"
        }`}
      >
        {!rightPanelCollapsed && (
          <div className="p-4 pt-16 z-10">
            <Accordion
              recursos={recursos}
              proyectos={proyectosSupabase}
              usuarios={usuariosFiltrados}
              onAddResource={handleAddResource}
              onUserClick={handleUserClick}
              onProyectoClick={handleProyectoClick}
            />
          </div>
        )}
      </div>

      {/* Activities positioned at fixed location */}
      <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '15rem', left: '1rem', zIndex: 20 }}>
        <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
          Actividades 🗓️
        </h2>
        <ActividadesGrid onShowDetails={handleShowActividadDetails} />
      </div>



      {/* Missions positioned at fixed location */}
      <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '6rem', left: '1rem', zIndex: 20 }}>
        <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
          Misiones 🎯
        </h2>
        <MisionesCompact onShowDetails={handleShowMisionDetails} />
      </div>

      {/* Modal para agregar recurso */}
      <AgregarRecursoModal
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
      />

 {/* Chart positioned at bottom left */}
      <div
        className="flex items-end gap-2 pointer-events-auto"
        style={{ position: 'fixed', bottom: '1rem', left: '1rem', zIndex: 60 }}
      >
        {previousDayBoardHistory.map((snapshot, index) => (
          <button
            key={snapshot.id}
            type="button"
            onClick={() => handleChartBarClick(snapshot)}
            className="group flex w-6 items-end justify-center rounded-sm bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{ height: chartMaxHeight }}
            title={`${snapshot.label}: ${snapshot.value} elementos`}
            aria-label={`${snapshot.label}: ${snapshot.value} elementos`}
          >
            <span
              className="w-6 rounded-sm bg-white/30 transition-all duration-150 group-hover:bg-white/50 group-active:scale-y-95"
              style={{ height: chartBarHeights[index] ?? 32 }}
            />
          </button>
        ))}
      </div>

      {/* Ventana de Screenshots */}
      <Ventana
        isOpen={!!showScreenshotsModal}
        onClose={() => setShowScreenshotsModal(null)}
        title="Screenshots de Actividad"
        initialWidth={800}
        initialHeight={600}
        minWidth={600}
        minHeight={400}
        showOverlay={true}
      >
        <div className="h-full flex flex-col">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Total: {showScreenshotsModal ? screenshots.filter(s => {
                const actividadId = showScreenshotsModal.split('-')[1] || '0';
                return s.id_bloque === actividadId;
              }).length : 0} capturas
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {showScreenshotsModal && screenshots
                .filter(s => {
                  const actividadId = showScreenshotsModal.split('-')[1] || '0';
                  return s.id_bloque === actividadId;
                })
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(screenshot => (
                  <div
                    key={screenshot.id}
                    className="border rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={screenshot.img_url || '/placeholder-image.png'}
                      alt={`Screenshot ${new Date(screenshot.created_at).toLocaleTimeString()}`}
                      className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        // Abrir imagen en nueva ventana/tab si existe la URL
                        if (screenshot.img_url) {
                          window.open(screenshot.img_url, '_blank');
                        }
                      }}
                    />
                    <div className="p-2">
                      <p className="text-xs text-gray-600">
                        {new Date(screenshot.created_at).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {showScreenshotsModal && screenshots.filter(s => {
              const actividadId = showScreenshotsModal.split('-')[1] || '0';
              return s.id_bloque === actividadId;
            }).length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">📷</div>
                  <p className="text-gray-500">No hay capturas disponibles</p>
                  <p className="text-sm text-gray-400">
                    Inicia la actividad para comenzar a capturar pantalla
                  </p>
                </div>
              )}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-end gap-2">
            <button
              onClick={() => {
                if (!showScreenshotsModal) return;
                const actividadId = showScreenshotsModal.split('-')[1] || '0';
                const activityScreenshots = screenshots.filter(s => s.id_bloque === actividadId);
                if (activityScreenshots.length > 0 && confirm('¿Estás seguro de que quieres eliminar todas las capturas de esta actividad?')) {
                  // Usar la función específica para eliminar por bloque
                  clearScreenshotsByBloque(actividadId);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              🗑️ Eliminar Todas
            </button>
            <button
              onClick={() => setShowScreenshotsModal(null)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Ventana>

      {/* Ventana de detalles de actividad */}
      <Ventana
        isOpen={showActividadDetails}
        onClose={() => setShowActividadDetails(false)}
        title="Detalles de la Actividad"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={false}
      >
        {selectedActividad && (
          <div className="text-black space-y-6 p-4">
            {/* Descripción */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <p className="text-gray-700">{selectedActividad.descripcion || 'Sin descripción'}</p>
            </div>

            {/* Fecha y Hora */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Fecha y Hora</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="font-medium">{formatDate(selectedActividad.fecha)}</p>
                <p className="text-gray-600">{formatTime(selectedActividad.hora_inicio)}</p>
              </div>
            </div>

            {/* Duración */}
            {selectedActividad.cant_horas && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Duración</h3>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <p className="font-medium text-blue-800">{selectedActividad.cant_horas} horas</p>
                </div>
              </div>
            )}

            {/* Tiempo dedicado */}
            {selectedActividad.tiempo_dedicado && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tiempo Dedicado</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800">{selectedActividad.tiempo_dedicado} minutos</p>
                </div>
              </div>
            )}

            {/* Link */}
            {selectedActividad.link && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enlace</h3>
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  onClick={() => window.open(selectedActividad.link!, '_blank')}
                >
                  Abrir enlace
                </button>
              </div>
            )}

            {/* Captures */}
            {selectedActividad.captures && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Notas</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedActividad.captures}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Ventana>

      {/* Ventana de detalles de misión */}
      <Ventana
        isOpen={showMisionDetails}
        onClose={() => setShowMisionDetails(false)}
        title="Detalles de la Misión"
        initialWidth={600}
        initialHeight={500}
        minWidth={500}
        minHeight={400}
        showOverlay={false}
      >
        {selectedMision && (
          <div className="text-black space-y-6 p-4">
            {/* Nombre */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Nombre</h3>
              <p className="text-gray-700 text-xl font-medium">{selectedMision.nombre || 'Sin nombre'}</p>
            </div>

            {/* Descripción */}
            {selectedMision.descripcion && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Descripción</h3>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedMision.descripcion}</p>
                </div>
              </div>
            )}

            {/* Fechas */}
            {(selectedMision.fecha_start || selectedMision.fecha_end) && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Fechas</h3>
                <div className="bg-blue-100 p-3 rounded-lg space-y-2">
                  {selectedMision.fecha_start && (
                    <p className="text-blue-800">
                      <span className="font-medium">Inicio:</span> {formatDate(selectedMision.fecha_start)}
                    </p>
                  )}
                  {selectedMision.fecha_end && (
                    <p className="text-blue-800">
                      <span className="font-medium">Fin:</span> {formatDate(selectedMision.fecha_end)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Horas */}
            {selectedMision.horas && selectedMision.horas > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Duración Estimada</h3>
                <div className="bg-green-100 p-3 rounded-lg">
                  <p className="font-medium text-green-800 text-xl">{selectedMision.horas} horas</p>
                </div>
              </div>
            )}

            {/* Estado/Progreso (si existe) */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Estado</h3>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <p className="font-medium text-yellow-800">En progreso</p>
              </div>
            </div>

            {/* ID de referencia */}
            <div>
              <h3 className="text-lg font-semibold mb-2">Información técnica</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-600 text-sm">ID: {selectedMision.id}</p>
                {selectedMision.id_usuario && (
                  <p className="text-gray-600 text-sm">Usuario: {selectedMision.id_usuario}</p>
                )}
              </div>
            </div>

            {/* Input para iniciar chat */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Contactar al responsable</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={misionChatMessage}
                  onChange={(e) => setMisionChatMessage(e.target.value)}
                  placeholder="Escribe un mensaje para iniciar el chat..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && misionChatMessage.trim()) {
                      setShowMisionChat(true);
                      console.log('Abriendo chat con mensaje:', misionChatMessage);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (misionChatMessage.trim()) {
                      setShowMisionChat(true);
                      console.log('Abriendo chat con mensaje:', misionChatMessage);
                    }
                  }}
                  disabled={!misionChatMessage.trim()}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chatear
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Envía un mensaje para abrir el chat con el responsable de esta misión</p>
            </div>
          </div>
        )}
      </Ventana>

      {/* Ventana de Chat de Misión */}
      <Ventana
        isOpen={showMisionChat}
        onClose={() => {
          setShowMisionChat(false);
          setMisionChatMessage('');
        }}
        title={`Chat: ${selectedMision?.nombre || 'Misión'}`}
        initialWidth={700}
        initialHeight={600}
        minWidth={500}
        minHeight={400}
        showOverlay={true}
      >
        <div className="h-full flex flex-col text-black">
          {/* Header del chat */}
          <div className="border-b pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white font-bold">
                {selectedMision?.id_usuario?.toString().substring(0, 2) || 'M'}
              </div>
              <div>
                <h3 className="font-semibold">Responsable de la misión</h3>
                <p className="text-sm text-gray-500">Usuario ID: {selectedMision?.id_usuario || 'Desconocido'}</p>
              </div>
            </div>
          </div>

          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-3">
            {/* Mensaje inicial del usuario */}
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-lg max-w-[70%]">
                <p className="text-sm">{misionChatMessage}</p>
                <p className="text-xs opacity-75 mt-1">{new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Mensaje informativo */}
            <div className="text-center">
              <div className="inline-block bg-gray-100 px-4 py-2 rounded-full">
                <p className="text-xs text-gray-600">Chat iniciado</p>
              </div>
            </div>
          </div>

          {/* Input de nuevo mensaje */}
          <div className="border-t pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors text-sm">
                Enviar
              </button>
            </div>
          </div>
        </div>
      </Ventana>

      {/* Input Area centrado abajo */}
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
        onSendMessage={(text) => {
          console.log('Mensaje enviado:', text);
          // Aquí puedes agregar la lógica para enviar mensajes
        }}
        className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
        placeholder="Escribe aquí para crear notas, tareas o enviar..."
      />

      {/* Ventana de historial de pizarra */}
      <Ventana
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title={selectedHistorySnapshot ? `Historial de la pizarra • ${selectedHistorySnapshot.savedAt}` : 'Historial de la pizarra'}
        initialWidth={960}
        initialHeight={640}
        minWidth={720}
        minHeight={480}
        showOverlay={true}
      >
        {selectedHistorySnapshot ? (
          <div className="text-black space-y-6 p-2 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{selectedHistorySnapshot.label}</h2>
                <p className="text-gray-600 text-sm">
                  Historial de los elementos guardados en la pizarra del {selectedHistorySnapshot.savedAt}
                </p>
              </div>
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
                {selectedHistorySnapshot.value} elementos almacenados
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {selectedHistorySnapshot.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700"
                >
                  {highlight}
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Elementos guardados</h3>
                <span className="text-xs uppercase tracking-wide text-gray-500">
                  {chartLoading ? 'Cargando...' : 'Datos de Supabase'}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {selectedHistorySnapshot.items.map((item) => {
                  // Determinar el color según el tipo
                  const getColorForType = (type: string) => {
                    switch(type) {
                      case 'Nota':
                        return {
                          bg: 'bg-gray-50',
                          border: 'border-gray-200',
                          badge: 'bg-gray-500 text-white',
                          text: 'text-gray-900'
                        };
                      case 'Tarea':
                        return {
                          bg: 'bg-yellow-50',
                          border: 'border-yellow-200',
                          badge: 'bg-yellow-500 text-white',
                          text: 'text-yellow-900'
                        };
                      case 'Actividad':
                        return {
                          bg: 'bg-blue-50',
                          border: 'border-blue-200',
                          badge: 'bg-blue-500 text-white',
                          text: 'text-blue-900'
                        };
                      case 'Mision':
                        return {
                          bg: 'bg-green-50',
                          border: 'border-green-200',
                          badge: 'bg-green-500 text-white',
                          text: 'text-green-900'
                        };
                      case 'Proyecto':
                        return {
                          bg: 'bg-indigo-50',
                          border: 'border-indigo-200',
                          badge: 'bg-indigo-500 text-white',
                          text: 'text-indigo-900'
                        };
                      case 'Chat':
                        return {
                          bg: 'bg-purple-50',
                          border: 'border-purple-200',
                          badge: 'bg-purple-500 text-white',
                          text: 'text-purple-900'
                        };
                      case 'Recurso':
                        return {
                          bg: 'bg-orange-50',
                          border: 'border-orange-200',
                          badge: 'bg-orange-500 text-white',
                          text: 'text-orange-900'
                        };
                      case 'Imagen':
                        return {
                          bg: 'bg-pink-50',
                          border: 'border-pink-200',
                          badge: 'bg-pink-500 text-white',
                          text: 'text-pink-900'
                        };
                      default:
                        return {
                          bg: 'bg-gray-50',
                          border: 'border-gray-200',
                          badge: 'bg-gray-500 text-white',
                          text: 'text-gray-900'
                        };
                    }
                  };

                  const colors = getColorForType(item.type);

                  return (
                    <div
                      key={item.id}
                      className={`border ${colors.border} rounded-xl ${colors.bg} p-4 shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-semibold ${colors.text} leading-snug`}>{item.title}</h4>
                        <span className={`ml-2 inline-flex items-center rounded-full ${colors.badge} px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide`}>
                          {item.type}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{item.summary}</p>
                      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                        <span>{item.owner}</span>
                        <span>{item.lastUpdated}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => {
                            console.log('🔍 Click en Agregar a pizarra', { item, cardData: item.cardData, pizarraRef: pizarraRef.current });
                            if (item.cardData && pizarraRef.current) {
                              console.log('✅ Restaurando card:', item.cardData);
                              // Usar el método de la pizarra para agregar el card
                              pizarraRef.current.restoreCard?.(item.cardData);

                              alert(`✅ ${item.type} "${item.title}" agregado a la pizarra`);
                            } else {
                              console.error('❌ No se puede restaurar:', {
                                hasCardData: !!item.cardData,
                                hasPizarraRef: !!pizarraRef.current
                              });
                            }
                          }}
                          className={`w-full ${colors.badge} px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity`}
                        >
                          Agregar a pizarra
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {chartError && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                Error cargando datos: {chartError}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-600 p-4">
            Selecciona una barra del gráfico para ver el detalle de la pizarra.
          </div>
        )}
      </Ventana>

      {/* Ventana de Chat */}
      <Ventana
        isOpen={showChatWindow}
        onClose={() => {
          setShowChatWindow(false);
          setSelectedChatUser(null);
        }}
        title={`Chat con ${selectedChatUser?.name || 'Usuario'}`}
        initialWidth={400}
        initialHeight={600}
        minWidth={350}
        minHeight={400}
        initialX={window.innerWidth / 2 - 200}
        initialY={window.innerHeight / 2 - 300}
      >
        {selectedChatUser && usuario && (
          <ChatWindow
            currentUserId={usuario.userAuth}
            targetUser={selectedChatUser}
          />
        )}
      </Ventana>

      {/* Ventana de Proyecto */}
      <Ventana
        isOpen={showProyectoWindow}
        onClose={() => {
          setShowProyectoWindow(false);
          setSelectedProyectoWindow(null);
        }}
        title={selectedProyectoWindow?.nombre || 'Proyecto'}
        initialWidth={700}
        initialHeight={700}
        minWidth={600}
        minHeight={500}
        initialX={window.innerWidth / 2 - 350}
        initialY={window.innerHeight / 2 - 350}
      >
        {selectedProyectoWindow && (
          <ProyectoWindow proyecto={selectedProyectoWindow} />
        )}
      </Ventana>

    </div>
  );
}
