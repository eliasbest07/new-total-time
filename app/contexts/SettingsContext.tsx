'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SettingsContextType {
  showSettingsModal: boolean;
  autoSave: boolean;
  showMemoryMonitor: boolean;
  theme: 'light' | 'dark' | 'auto';
  openSettings: () => void;
  closeSettings: () => void;
  setAutoSave: (value: boolean) => void;
  setShowMemoryMonitor: (value: boolean) => void;
  setTheme: (value: 'light' | 'dark' | 'auto') => void;
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
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('light'); // Por defecto modo claro

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

      const savedTheme = localStorage.getItem('total-time-theme') as 'light' | 'dark' | 'auto' | null;
      if (savedTheme !== null) {
        setThemeState(savedTheme);
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

  // Función para actualizar tema
  const setTheme = (value: 'light' | 'dark' | 'auto') => {
    setThemeState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('total-time-theme', value);
      console.log('🎨 Tema', value === 'light' ? 'Claro' : value === 'dark' ? 'Oscuro' : 'Automático');
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
        theme,
        openSettings,
        closeSettings,
        setAutoSave,
        setShowMemoryMonitor,
        setTheme
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};