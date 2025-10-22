'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ChatWindowData {
  id: string; // ID único de la ventana (puede ser el userId del otro usuario)
  userId: string; // userAuth del otro usuario
  userName: string; // Nombre del otro usuario
  userAvatar: string; // Avatar del otro usuario
  userColor: string; // Color del otro usuario
  isOnline: boolean; // Si el usuario está online
  position?: { x: number; y: number }; // Posición de la ventana
  isMinimized?: boolean; // Si la ventana está minimizada
}

interface ChatWindowContextType {
  chatWindows: ChatWindowData[];
  openChatWindow: (userData: Omit<ChatWindowData, 'id'> & { id?: string }) => void;
  closeChatWindow: (windowId: string) => void;
  minimizeChatWindow: (windowId: string) => void;
  maximizeChatWindow: (windowId: string) => void;
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void;
}

const ChatWindowContext = createContext<ChatWindowContextType | undefined>(undefined);

export const ChatWindowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatWindows, setChatWindows] = useState<ChatWindowData[]>([]);

  const openChatWindow = useCallback((userData: Omit<ChatWindowData, 'id'> & { id?: string }) => {
    const windowId = userData.id || userData.userId;

    setChatWindows((prev) => {
      // Si ya existe, traerla al frente y maximizarla
      const existingIndex = prev.findIndex((w) => w.id === windowId);
      if (existingIndex !== -1) {
        const updated = [...prev];
        const existing = { ...updated[existingIndex], isMinimized: false };
        updated.splice(existingIndex, 1);
        updated.push(existing);
        return updated;
      }

      // Si no existe, crear nueva ventana
      const newWindow: ChatWindowData = {
        ...userData,
        id: windowId,
        position: userData.position || {
          x: 100 + (prev.length * 30),
          y: 100 + (prev.length * 30)
        },
        isMinimized: false
      };

      return [...prev, newWindow];
    });
  }, []);

  const closeChatWindow = useCallback((windowId: string) => {
    setChatWindows((prev) => prev.filter((w) => w.id !== windowId));
  }, []);

  const minimizeChatWindow = useCallback((windowId: string) => {
    setChatWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, isMinimized: true } : w))
    );
  }, []);

  const maximizeChatWindow = useCallback((windowId: string) => {
    setChatWindows((prev) => {
      const windowIndex = prev.findIndex((w) => w.id === windowId);
      if (windowIndex === -1) return prev;

      const updated = [...prev];
      const window = { ...updated[windowIndex], isMinimized: false };
      updated.splice(windowIndex, 1);
      updated.push(window);
      return updated;
    });
  }, []);

  const updateWindowPosition = useCallback((windowId: string, position: { x: number; y: number }) => {
    setChatWindows((prev) =>
      prev.map((w) => (w.id === windowId ? { ...w, position } : w))
    );
  }, []);

  return (
    <ChatWindowContext.Provider
      value={{
        chatWindows,
        openChatWindow,
        closeChatWindow,
        minimizeChatWindow,
        maximizeChatWindow,
        updateWindowPosition
      }}
    >
      {children}
    </ChatWindowContext.Provider>
  );
};

export const useChatWindows = () => {
  const context = useContext(ChatWindowContext);
  if (!context) {
    throw new Error('useChatWindows debe usarse dentro de ChatWindowProvider');
  }
  return context;
};
