"use client";

import Pizarra, { PizarraRef } from "@/application/pizarra/pizarra";
import { useRef, useState, useCallback } from "react";
import Ventana from "@/app/demo/components/Ventana";
import Perfil from "@/app/components/mainUI/Perfil";
import { useAuth } from "@/app/contexts/AuthContext";
import ChatWindow from "@/app/components/ChatWindow";
import InputAreaLight from "@/app/components/mainUI/InputAreaLight";
import OnlineUsersBar from "@/app/components/mainUI/OnlineUsersBar";
import SalasBar from "@/app/components/mainUI/SalasBar";
import MisionesLight from "@/app/components/mainUI/MisionesLight";
import { useIncomingMessages } from "@/hooks/useIncomingMessages";

export default function LightPage() {
  const pizarraRef = useRef<PizarraRef>(null);
  const { usuario } = useAuth();

  const [showChatWindow, setShowChatWindow] = useState(false);
  const [selectedChatUser, setSelectedChatUser] = useState<{
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  } | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string>("");

  // Handler para cuando se hace click en un usuario
  const handleUserClick = (userData: {
    userId: string;
    name: string;
    avatar?: string;
    color?: string;
    online?: boolean;
  }, message?: string) => {
    console.log('👤 handleUserClick en light page:', userData);
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

  return (
    <>
      <div
        className="relative flex flex-col bg-green-900"
        style={{ height: '100vh' }}
      >
        {/* Pizarra con borde negro punteado - ocupa toda el área con pequeño margen */}
        <div className="absolute inset-0 p-2" style={{ zIndex: 10 }}>
          {/* <div
            className="border-4 border-dashed border-black rounded-3xl overflow-hidden bg-white w-full h-full"
          > */}
            <Pizarra
              ref={pizarraRef}
              onShowScreenshots={() => { }}
              storagePrefix="light"
              lightMode={true}
              fullMode={true}
              onOpenUserChat={handleUserClick}
            />
          </div>
        

        {/* Perfil en la esquina superior izquierda */}
        <div className="mb-8 px-2 z-30 pointer-events-auto w-fit">
          <Perfil
            lightMode={true}
            showPizarraControls={true}
            onClearStorage={() => pizarraRef.current?.clearStorage?.()}
            onExportJSON={() => pizarraRef.current?.exportStorage?.()}
            onImportJSON={(content) => pizarraRef.current?.importStorage?.(content)}
            onSaveToSupabase={async () => {
              const success = await pizarraRef.current?.saveToSupabase?.();
              if (success) {
                alert('✅ Pizarra guardada exitosamente');
              } else {
                alert('❌ Error al guardar la pizarra en la nube');
              }
            }}
            onLoadFromSupabase={async () => {
              await pizarraRef.current?.loadFromSupabase?.();
              alert('✅ Pizarra cargada desde Supabase');
            }}
          />
        </div>

        {/* Barra de usuarios conectados - Por encima de la pizarra con mayor margen top */}
        {/* <div className="fixed left-1/2 transform -translate-x-1/2 z-40 pointer-events-auto" style={{ top: '60px' }}>
        <OnlineUsersBar onUserClick={handleUserClick} />
      </div> */}

        {/* Barra de salas - Debajo de usuarios conectados */}
        <div className="fixed left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto" style={{ width: '80%', top: '60px' }}>
          <SalasBar />
        </div>

        {/* Misiones - Esquina inferior izquierda */}
        <div className="fixed bottom-4 left-4 z-50 pointer-events-auto">
          <MisionesLight />
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
          placeholder="Escribe aquí para crear notas, tareas o enviar..."
        />
      </div>

      {/* Ventana de Chat - Fuera del contenedor principal para evitar problemas de z-index */}
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
    </>
  );
}
