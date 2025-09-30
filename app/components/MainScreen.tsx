"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState } from "react";
import Ventana from "@/app/demo/components/Ventana";
import { useScreenshots } from "@/hooks/useScreenshots";

import Perfil from "@/app/components/mainUI/Perfil";
import RelojActual from "@/app/components/mainUI/RelojActual";
import Salas from "@/app/components/mainUI/Salas";
import { ChevronRight } from "lucide-react";
import Cube from "./mainUI/cubo-acordion-carga";
import Accordion from "../demo/components/Accordion";
import { Resource } from "../demo/utils/resourceUtils";
import ActividadesGrid from "../demo/components/ActividadesGrid";
import MisionesCompact from "./mainUI/MisionesCompact";
import { useRecursos } from "@/hooks/useRecursos";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuariosOrganizacion } from "@/hooks/useUsuariosOrganizacion";
import { useAuth } from "@/app/contexts/AuthContext";
import { useEffect } from "react";
import { FileText, Link, Code, Image, Video, Download } from "lucide-react";
import AgregarRecursoModal from "./modals/AgregarRecursoModal";


export default function MainScreen() {
  const pizarraRef = useRef<PizarraRef>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [recursos, setRecursos] = useState<Resource[]>([]);
  const [showActividadDetails, setShowActividadDetails] = useState(false);
  const [selectedMision, setSelectedMision] = useState<{title: string, hours: number} | null>(null);
  const [showMisionDetails, setShowMisionDetails] = useState(false);
  const [showAddResourceModal, setShowAddResourceModal] = useState(false);
  const [showScreenshotsModal, setShowScreenshotsModal] = useState<string | null>(null);
  
  const { usuario } = useAuth();
  const { recursos: recursosSupabase, loading: recursosLoading } = useRecursos(usuario?.id || null);
  const { proyectos: proyectosSupabase, loading: proyectosLoading } = useProyectos(usuario?.id || null);
  const { usuarios: usuariosOrganizacion, loading: usuariosLoading } = useUsuariosOrganizacion(usuario?.idOrganizacion || null);
  
  // Hook para screenshots
  const {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearScreenshots,
    clearScreenshotsByActivity,
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
    const iconMap: { [key: string]: any } = {
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

  // Función para formatear timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Función para manejar la apertura de screenshots
  const handleShowScreenshots = (cardId: string) => {
    setShowScreenshotsModal(cardId);
  };


  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 1rem)', padding: '0.5rem' }}>

      <div className="absolute inset-0 z-30">
        <Pizarra ref={pizarraRef} onShowScreenshots={handleShowScreenshots} />
      </div>

      {/* estos dos componentes abajo estan dentro de demo, tiene que estar afuera para ser usados en cualquier parte */}
      <div className="mb-8 px-2 z-30 pointer-events-auto w-fit">
        <Perfil />
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
            className={`w-4 h-4 transition-transform duration-300 ${
              rightPanelCollapsed ? 'rotate-180' : ''
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

      <div className={`fixed top-0 right-0 h-auto flex flex-col transition-all duration-300 z-30 ${
          rightPanelCollapsed ? "w-0" : "w-80"
        }`}
      >
        {!rightPanelCollapsed && (
          <div className="p-4 pt-16 z-10">
            <Accordion 
              recursos={recursos} 
              proyectos={proyectosSupabase}
              usuarios={usuariosOrganizacion}
              onAddResource={handleAddResource} 
            />
          </div>
        )}
      </div>

        {/* Activities positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '15rem', left: '1rem', zIndex: 30 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Actividades 🗓️
          </h2>
          <div
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', 'Actividades - Elemento arrastrado desde la interfaz');
            }}
            onClick={() => setShowActividadDetails(true)}
          >
             <ActividadesGrid />
          </div>
        </div>



        {/* Missions positioned at fixed location */}
        <div className="pointer-events-auto" style={{ position: 'fixed', bottom: '6rem', left: '1rem', zIndex: 10 }}>
          <h2 className="text-gray-900 bg-white/80 backdrop-blur-sm px-2 py-2 rounded-lg text-xl mb-3 inline-block">
            Misiones 🎯
          </h2>
          <MisionesCompact />
        </div>

      {/* Modal para agregar recurso */}
      <AgregarRecursoModal
        isOpen={showAddResourceModal}
        onClose={() => setShowAddResourceModal(false)}
      />

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
                const actividadId = parseInt(showScreenshotsModal.split('-')[1]) || 0;
                return s.actividadId === actividadId;
              }).length : 0} capturas
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {showScreenshotsModal && screenshots
                .filter(s => {
                  const actividadId = parseInt(showScreenshotsModal.split('-')[1]) || 0;
                  return s.actividadId === actividadId;
                })
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(screenshot => (
                  <div
                    key={screenshot.id}
                    className="border rounded-lg overflow-hidden bg-gray-50 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={screenshot.filePath}
                      alt={`Screenshot ${formatTimestamp(screenshot.timestamp)}`}
                      className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => {
                        // Abrir imagen en nueva ventana/tab
                        window.open(screenshot.filePath, '_blank');
                      }}
                    />
                    <div className="p-2">
                      <p className="text-xs text-gray-600">
                        {formatTimestamp(screenshot.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {showScreenshotsModal && screenshots.filter(s => {
              const actividadId = parseInt(showScreenshotsModal.split('-')[1]) || 0;
              return s.actividadId === actividadId;
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
                const actividadId = parseInt(showScreenshotsModal.split('-')[1]) || 0;
                const activityScreenshots = screenshots.filter(s => s.actividadId === actividadId);
                if (activityScreenshots.length > 0 && confirm('¿Estás seguro de que quieres eliminar todas las capturas de esta actividad?')) {
                  // Usar la función específica para eliminar por actividad
                  clearScreenshotsByActivity(actividadId);
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

    </div>
  );
}