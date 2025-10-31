"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState, useCallback } from "react";
import Ventana from "@/app/demo/components/Ventana";
import AuthWrapper from "@/app/components/AuthWrapper";
import { useAuth } from "@/app/contexts/AuthContext";
import ChatWindow from "@/app/components/ChatWindow";
import InputAreaLight from "@/app/components/mainUI/InputAreaLight";
import MisionesOrganizacion from "@/app/components/organizacion/MisionesOrganizacion";
import ListadoProyectos from "@/app/components/organizacion/ListadoProyectos";
import InfoOrganizacion from "@/app/components/organizacion/InfoOrganizacion";
import { useIncomingMessages } from "@/hooks/useIncomingMessages";
import { useMisiones } from "@/hooks/useMisiones";
import { useUsuarioId } from "@/hooks/useUsuarioId";
import { useProyectos } from "@/hooks/useProyectos";
import { useUsuariosOrganizacionContext } from "@/app/contexts/UsuariosOrganizacionContext";
import { useOrganizacion } from "@/hooks/useOrganizacion";
import { Target, Building2, X } from "lucide-react";
import Image from "next/image";

export default function DashboardPage() {
  const pizarraRef = useRef<PizarraRef>(null);
  const { usuario } = useAuth();
  const { usuarioId } = useUsuarioId();
  const { createMision } = useMisiones(usuarioId);
  const { createProyecto } = useProyectos();
  const { usuarios } = useUsuariosOrganizacionContext();
  const { organizacion } = useOrganizacion(usuario?.userAuth || null);

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

  // Estado del formulario de proyecto
  const [showNuevoProyectoModal, setShowNuevoProyectoModal] = useState(false);
  const [proyectoNombre, setProyectoNombre] = useState("");
  const [proyectoDescripcion, setProyectoDescripcion] = useState("");
  const [proyectoIcono, setProyectoIcono] = useState("");
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState<number[]>([]);
  const [creandoProyecto, setCreandoProyecto] = useState(false);

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
        // Crear el card en la pizarra automáticamente
        if (pizarraRef.current?.addMisionCardOrganizacion) {
          pizarraRef.current.addMisionCardOrganizacion({
            id_mision: nuevaMision.id,
            title: nuevaMision.nombre || 'Misión',
            description: nuevaMision.descripcion || '',
            hours: nuevaMision.horas || 1,
            id_usuario_asignado: nuevaMision.id_usuario || undefined,
          });
        }

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

  // Limpiar formulario de proyecto
  const limpiarFormularioProyecto = () => {
    setProyectoNombre("");
    setProyectoDescripcion("");
    setProyectoIcono("");
    setUsuariosSeleccionados([]);
  };

  // Crear nuevo proyecto
  const handleCrearProyecto = async () => {
    if (!proyectoNombre.trim()) {
      alert("Por favor ingresa un nombre para el proyecto");
      return;
    }

    if (!organizacion?.id) {
      alert("Error: No se pudo identificar la organización");
      return;
    }

    setCreandoProyecto(true);

    try {
      const nuevoProyecto = await createProyecto({
        nombre: proyectoNombre.trim(),
        descripcion: proyectoDescripcion.trim() || null,
        icono: proyectoIcono.trim() || null,
        id_organizacion: organizacion.id,
      });

      if (nuevoProyecto) {
        // Asignar usuarios al proyecto si hay usuarios seleccionados
        if (usuariosSeleccionados.length > 0) {
          const { supabase } = await import('@/infrastructure/services/SupabaseClient');

          const usuarioProyectoRelaciones = usuariosSeleccionados.map(usuarioId => ({
            id_proyecto: nuevoProyecto.id,
            id_usuario: usuarioId
          }));

          const { error: relacionError } = await supabase
            .from('usuario_proyecto')
            .insert(usuarioProyectoRelaciones);

          if (relacionError) {
            console.error('Error asignando usuarios al proyecto:', relacionError);
            alert("⚠️ Proyecto creado pero hubo un error asignando usuarios");
          }
        }

        alert("✅ Proyecto creado exitosamente");
        limpiarFormularioProyecto();
        setShowNuevoProyectoModal(false);
      } else {
        alert("❌ Error al crear el proyecto");
      }
    } catch (error) {
      console.error("Error creando proyecto:", error);
      alert("❌ Error al crear el proyecto");
    } finally {
      setCreandoProyecto(false);
    }
  };

  // Toggle selección de usuario
  const toggleUsuarioSeleccionado = (usuarioId: number) => {
    setUsuariosSeleccionados(prev =>
      prev.includes(usuarioId)
        ? prev.filter(id => id !== usuarioId)
        : [...prev, usuarioId]
    );
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
            fullMode={true}
            usuarios={usuarios}
            currentUserId={usuario?.userAuth}
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
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg p-3 shadow-lg transition-all hover:scale-105 flex flex-col items-center justify-center gap-2 mb-3"
              title="Información de la Organización"
            >
              {organizacion?.img_profile ? (
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/20 flex items-center justify-center">
                  <Image
                    src={organizacion.img_profile}
                    alt={organizacion.nombre}
                    width={48}
                    height={48}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {organizacion ? organizacion.nombre.charAt(0).toUpperCase() : 'O'}
                  </span>
                </div>
              )}
              <span className="text-xs font-semibold text-center line-clamp-2 leading-tight">
                {organizacion ? organizacion.nombre : 'Organización'}
              </span>
            </button>
          </div>

          <ListadoProyectos
            onProyectoClick={(proyectoId) => {
              console.log("Proyecto seleccionado:", proyectoId);
              // TODO: Implementar navegación o modal de detalles del proyecto
            }}
            onCrearProyecto={() => setShowNuevoProyectoModal(true)}
          />
        </div>

        {/* Misiones - Esquina superior derecha */}
        <div className="fixed top-20 right-4 z-50 pointer-events-auto">
          <MisionesOrganizacion />
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

      {/* Modal para crear nuevo proyecto */}
      {showNuevoProyectoModal && (
        <Ventana
          isOpen={showNuevoProyectoModal}
          onClose={() => {
            setShowNuevoProyectoModal(false);
            limpiarFormularioProyecto();
          }}
          title="Crear Nuevo Proyecto"
          initialWidth={700}
          initialHeight={600}
          minWidth={600}
          minHeight={500}
          showOverlay={true}
        >
          <div className="p-6 space-y-4" style={{ color: '#000000' }}>
            {/* Nombre del proyecto */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Nombre del Proyecto <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                value={proyectoNombre}
                onChange={(e) => setProyectoNombre(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="Ej: Sistema de Gestión"
                disabled={creandoProyecto}
              />
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Descripción
              </label>
              <textarea
                value={proyectoDescripcion}
                onChange={(e) => setProyectoDescripcion(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                style={{ color: '#000000' }}
                rows={4}
                placeholder="Describe el proyecto..."
                disabled={creandoProyecto}
              />
            </div>

            {/* URL del ícono */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                URL del Ícono (opcional)
              </label>
              <input
                type="text"
                value={proyectoIcono}
                onChange={(e) => setProyectoIcono(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                style={{ color: '#000000' }}
                placeholder="https://ejemplo.com/icono.png"
                disabled={creandoProyecto}
              />
              {proyectoIcono && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1">Vista previa:</p>
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300">
                    <img
                      src={proyectoIcono}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Selección de usuarios */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#000000' }}>
                Asignar Usuarios (opcional)
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                {usuarios.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay usuarios disponibles</p>
                ) : (
                  <div className="space-y-2">
                    {usuarios.map((usuario) => (
                      <label
                        key={usuario.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={usuariosSeleccionados.includes(usuario.id)}
                          onChange={() => toggleUsuarioSeleccionado(usuario.id)}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          disabled={creandoProyecto}
                        />
                        <div className="flex items-center gap-2 flex-1">
                          {usuario.profile.avatar ? (
                            <img
                              src={usuario.profile.avatar}
                              alt={usuario.getNombreCompleto()}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {usuario.profile.nombre.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {usuario.getNombreCompleto()}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              @{usuario.profile.username}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {usuariosSeleccionados.length > 0 && (
                <p className="text-xs text-gray-600 mt-2">
                  {usuariosSeleccionados.length} usuario(s) seleccionado(s)
                </p>
              )}
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowNuevoProyectoModal(false);
                  limpiarFormularioProyecto();
                }}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-black rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoProyecto}
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearProyecto}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creandoProyecto}
              >
                {creandoProyecto ? "Creando..." : "Crear Proyecto"}
              </button>
            </div>
          </div>
        </Ventana>
      )}
    </AuthWrapper>
  );
}
