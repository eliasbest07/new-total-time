 'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import Ventana from '../demo/components/Ventana';
import { useRouter } from 'next/navigation';

const SettingsModal = () => {
  const { showSettingsModal, closeSettings, autoSave, setAutoSave, showMemoryMonitor, setShowMemoryMonitor, theme, setTheme } = useSettings();
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'full' | 'light'>('full');

  useEffect(() => {
    // Leer el modo actual del localStorage
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('total-time-view-mode') as 'full' | 'light' | null;
      if (savedMode) {
        setViewMode(savedMode);
      }
    }
  }, [showSettingsModal]);

  const handleViewModeChange = (mode: 'full' | 'light') => {
    setViewMode(mode);
    localStorage.setItem('total-time-view-mode', mode);
    router.push(mode === 'light' ? '/light' : '/');
    closeSettings();
  };

  return (
    <Ventana
      isOpen={showSettingsModal}
      onClose={closeSettings}
      title="Configuraciones"
      initialWidth={700}
      initialHeight={500}
      minWidth={600}
      minHeight={400}
      showOverlay={true}
    >
      <div className="text-black space-y-6 p-4">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Configuraciones Generales</h3>

          {/* Modo de visualización Total Time */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-3">
              <h4 className="font-semibold text-gray-900">Modo de Visualización</h4>
              <p className="text-sm text-gray-600">Selecciona el modo de trabajo que prefieres</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleViewModeChange('full')}
                className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all border-2 ${
                  viewMode === 'full'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Vista Completa</span>
                  <span className="text-xs opacity-75">Todas las herramientas disponibles</span>
                </div>
              </button>
              <button
                onClick={() => handleViewModeChange('light')}
                className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-all border-2 ${
                  viewMode === 'light'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-semibold">Vista Light</span>
                  <span className="text-xs opacity-75">Interfaz minimalista y enfocada</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tema */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Tema</h4>
              <p className="text-sm text-gray-600">Personaliza la apariencia de la aplicación</p>
            </div>
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg"
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
            >
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
              <option value="auto">Automático</option>
            </select>
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Notificaciones</h4>
              <p className="text-sm text-gray-600">Recibe alertas y recordatorios</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Auto-guardado */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Auto-guardado en Supabase</h4>
              <p className="text-sm text-gray-600">Guarda automáticamente tu trabajo en la nube cada vez que hay cambios</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Monitor de Memoria */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Monitor de Memoria</h4>
              <p className="text-sm text-gray-600">Muestra el uso de memoria en tiempo real de la aplicación</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showMemoryMonitor}
                onChange={(e) => setShowMemoryMonitor(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Idioma */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Idioma</h4>
              <p className="text-sm text-gray-600">Selecciona tu idioma preferido</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg">
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button 
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            onClick={closeSettings}
          >
            Cancelar
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            onClick={() => {
              // Aquí se guardarían las configuraciones
              console.log('Guardando configuraciones...');
              closeSettings();
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </Ventana>
  );
};

export default SettingsModal;