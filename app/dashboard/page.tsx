"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState, useCallback } from "react";
import Ventana from "@/app/demo/components/Ventana";
import AuthWrapper from "@/app/components/AuthWrapper";
import { useAuth } from "@/app/contexts/AuthContext";
import ChatWindow from "@/app/components/ChatWindow";
import InputAreaLight from "@/app/components/mainUI/InputAreaLight";
import MisionesLight from "@/app/components/mainUI/MisionesLight";
import ListadoProyectos from "@/app/components/organizacion/ListadoProyectos";
import InfoOrganizacion from "@/app/components/organizacion/InfoOrganizacion";
import { useIncomingMessages } from "@/hooks/useIncomingMessages";
import { useMisiones } from "@/hooks/useMisiones";
import { useUsuarioId } from "@/hooks/useUsuarioId";
import { Target, Building2 } from "lucide-react";

export default function DashboardPage() {
  const pizarraRef = useRef<PizarraRef>(null);
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision } = useMisiones(usuarioId);

  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<{
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [showMisionesModal, setShowMisionesModal] = useState(false);
  const [showInfoOrganizacion, setShowInfoOrganizacion] = useState(false);

  // Estado del formulario de misión
  const [misionNombre, setMisionNombre] = useState("");
  const [misionDescripcion, setMisionDescripcion] = useState("");
  const [misionFechaInicio, setMisionFechaInicio] = useState("");
  const [misionFechaFin, setMisionFechaFin] = useState("");
  const [misionHoras, setMisionHoras] = useState("");
  const [creandoMision, setCreandoMision] = useState(false);

  // Handler para cuando se hace click en un usuario
  const handleUserClick = (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }, message?: string) => {
    console.log('👤 handleUserClick en dashboard:', userData);
    setSelectedChatUser(userData);
    if (message) {
      setPendingMessage(message);
    }
    setShowChatWindow(true);
  };

  // Handler para mensajes entrantes
  const handleIncomingMessage = useCallback((userData: {
    userId: string;
    userName: string;
    userAvatar: string;
    userColor: string;
    isOnline: boolean;
  }) => {
    console.log('🔔 Mensaje entrante recibido:', userData);

    // Abrir la ventana del chat con el emisor
    setSelectedChatUser({
      userId: userData.userId,
      name: userData.userName,
      avatar: userData.userAvatar,
      color: userData.userColor,
      online: userData.isOnline
    });
    setShowChatWindow(true);
  }, []);

  // Suscribirse a mensajes entrantes
  useIncomingMessages(usuario?.userAuth || null, {
    onNewMessage: handleIncomingMessage
  });

  // Limpiar formulario de misión
  const limpiarFormularioMision = () => {
    setMisionNombre("");
    setMisionDescripcion("");
    setMisionFechaInicio("");
    setMisionFechaFin("");
    setMisionHoras("");
  };

  // Crear nueva misión
  const handleCrearMision = async () => {
    // Validaciones
    if (!misionNombre.trim()) {
      alert("Por favor ingresa un nombre para la misión");
      return;
    }

    if (!usuarioId) {
      alert("Error: No se pudo identificar el usuario");
      return;
    }

    setCreandoMision(true);

    try {
      const nuevaMision = await createMision({
        nombre: misionNombre.trim(),
        descripcion: misionDescripcion.trim() || null,
        horas: misionHoras ? parseInt(misionHoras) : null,
        fecha_start: misionFechaInicio || null,
        fecha_end: misionFechaFin || null,
        id_usuario: usuarioId,
        id_proyecto: null, // Por ahora null
        id_creador: usuario?.userAuth || null
      });

      if (nuevaMision) {
        alert("✅ Misión creada exitosamente");
        limpiarFormularioMision();
        setShowMisionesModal(false);
      } else {
        alert("❌ Error al crear la misión");
      }
    } catch (error) {
      console.error("Error creando misión:", error);
      alert("❌ Error al crear la misión");
    } finally {
      setCreandoMision(false);
    }
  };

  return (
    <AuthWrapper>
      <div
        className="relative"
        style={{ height: 'calc(100vh - 4rem)' }}
      >
        {/* Pizarra ocupando todo el espacio */}
        <div className="absolute inset-0 m-1" style={{ zIndex: 10 }}>
          <Pizarra
            ref={pizarraRef}
            onShowScreenshots={() => {}}
            storagePrefix="organizacion"
            lightMode={true}
          />
        </div>

        {/* Panel izquierdo flotante - Listado de Proyectos */}
        <div
          className="fixed top-20 left-4 overflow-y-auto bg-transparent pointer-events-auto"
          style={{ width: '120px', maxHeight: 'calc(100vh - 10rem)', zIndex: 50 }}
        >
          <div className="mb-3">
            <button
              onClick={() => setShowInfoOrganizacion(true)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg p-3 shadow-lg transition-all hover:scale-105 flex items-center justify-center mb-3"
              title="Información de la Organización"
            >
              <Building2 size={20} />
            </button>
          </div>

          <ListadoProyectos
            onProyectoClick={(proyectoId) => {
              console.log("Proyecto seleccionado:", proyectoId);
              // TODO: Implementar navegación o modal de detalles del proyecto
            }}
            onCrearProyecto={() => {
              console.log("Crear nuevo proyecto");
              // TODO: Implementar modal de creación de proyecto
            }}
          />
        </div>

        {/* Misiones - Esquina superior derecha */}
        <div className="fixed top-20 right-4 z-50 pointer-events-auto">
          <MisionesLight />
        </div>

        {/* Botón para crear misiones/actividades - Esquina inferior derecha */}
        <div className="fixed bottom-20 right-4 z-50 pointer-events-auto">
          <button
            onClick={() => setShowMisionesModal(true)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110 flex items-center gap-2"
            title="Crear Misión/Actividad"
          >
            <Target size={24} />
            <span className="font-semibold">Nueva Misión</span>
          </button>
        </div>

        {/* Input Area centrado abajo con lista de usuarios */}
        <InputAreaLight
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
            handleUserClick(user, text);
          }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          placeholder="Escribe para crear notas, tareas o enviar a usuarios..."
        />
      </div>

      {/* Ventana de Chat */}
      {showChatWindow && (
        <Ventana
          isOpen={showChatWindow}
          onClose={() => {
            setShowChatWindow(false);
            setSelectedChatUser(null);
            setPendingMessage("");
          }}
          title={`Chat con ${selectedChatUser?.name || 'Usuario'}`}
          initialWidth={450}
          initialHeight={600}
          defaultMaximized={false}
        >
          {selectedChatUser && usuario && (
            <ChatWindow
              key={`${selectedChatUser.userId}-${pendingMessage}`}
              currentUserId={usuario.userAuth}
              targetUser={selectedChatUser}
              initialMessage={pendingMessage}
            />
          )}
        </Ventana>
      )}

      {/* Modal para crear misiones/actividades */}
      {showMisionesModal && (
        <Ventana
          isOpen={showMisionesModal}
          onClose={() => {
            setShowMisionesModal(false);
            limpiarFormularioMision();
          }}
          title="Crear Nueva Misión"
          initialWidth={600}
          initialHeight={500}
          minWidth={500}
          minHeight={400}
          showOverlay={true}
        >
          <div className="p-6 space-y-4" style={{ color: '#000000' }}>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Nombre de la Misión <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={misionNombre}
                onChange={(e) => setMisionNombre(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="Ej: Desarrollar nueva funcionalidad"
                disabled={creandoMision}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Descripción
              </label>
              <textarea
                value={misionDescripcion}
                onChange={(e) => setMisionDescripcion(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                style={{ color: '#000000' }}
                rows={4}
                placeholder="Describe la misión o actividad..."
                disabled={creandoMision}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={misionFechaInicio}
                  onChange={(e) => setMisionFechaInicio(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoMision}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={misionFechaFin}
                  onChange={(e) => setMisionFechaFin(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  style={{ color: '#000000', colorScheme: 'light' }}
                  disabled={creandoMision}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Horas Estimadas
              </label>
              <input
                type="number"
                value={misionHoras}
                onChange={(e) => setMisionHoras(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="Ej: 8"
                min="0"
                disabled={creandoMision}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowMisionesModal(false);
                  limpiarFormularioMision();
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoMision}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearMision}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoMision}
              >
                {creandoMision ? "Creando..." : "Crear Misión"}
              </button>
            </div>
          </div>
        </Ventana>
      )}

      {/* Modal de Información de la Organización */}
      {showInfoOrganizacion && (
        <Ventana
          isOpen={showInfoOrganizacion}
          onClose={() => setShowInfoOrganizacion(false)}
          title="Información de la Organización"
          initialWidth={500}
          initialHeight={600}
          minWidth={400}
          minHeight={500}
          showOverlay={true}
        >
          <InfoOrganizacion />
        </Ventana>
      )}
    </AuthWrapper>
  );
}
