'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SettingsContextType {
  showSettingsModal: boolean;
  autoSave: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  setAutoSave: (value: boolean) => void;
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

  // Cargar configuración de auto-guardado desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAutoSave = localStorage.getItem('total-time-auto-save');
      if (savedAutoSave !== null) {
        setAutoSaveState(savedAutoSave === 'true');
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

  const openSettings = () => setShowSettingsModal(true);
  const closeSettings = () => setShowSettingsModal(false);

  return (
    <SettingsContext.Provider
      value={{
        showSettingsModal,
        autoSave,
        openSettings,
        closeSettings,
        setAutoSave
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};