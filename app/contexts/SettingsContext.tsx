'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SettingsContextType {
  showSettingsModal: boolean;
  autoSave: boolean;
  showMemoryMonitor: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setAutoSave: (value: boolean) => void;
  setShowMemoryMonitor: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [autoSave, setAutoSaveState] = useState(true); // Por defecto activado
  const [showMemoryMonitor, setShowMemoryMonitorState] = useState(true); // Por defecto activado

  // Cargar configuraciones desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAutoSave = localStorage.getItem('total-time-auto-save');
      if (savedAutoSave !== null) {
        setAutoSaveState(savedAutoSave === 'true');
      }

      const savedMemoryMonitor = localStorage.getItem('total-time-memory-monitor');
      if (savedMemoryMonitor !== null) {
        setShowMemoryMonitorState(savedMemoryMonitor === 'true');
      }
    }
  }, []);

  // Función para actualizar auto-guardado
  const setAutoSave = (value: boolean) => {
    setAutoSaveState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('total-time-auto-save', String(value));
      console.log('💾 Auto-guardado', value ? 'activado' : 'desactivado');
    }
  };

  // Función para actualizar visibilidad del monitor de memoria
  const setShowMemoryMonitor = (value: boolean) => {
    setShowMemoryMonitorState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('total-time-memory-monitor', String(value));
      console.log('🖥️ Monitor de Memoria', value ? 'visible' : 'oculto');
    }
  };

  const openSettings = () => setShowSettingsModal(true);
  const closeSettings = () => setShowSettingsModal(false);

  return (
    <SettingsContext.Provider
      value={{
        showSettingsModal,
        autoSave,
        showMemoryMonitor,
        openSettings,
        closeSettings,
        setAutoSave,
        setShowMemoryMonitor
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};