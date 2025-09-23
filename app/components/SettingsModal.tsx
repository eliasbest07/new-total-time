 'use client';

import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import Ventana from '../demo/components/Ventana';

const SettingsModal = () => {
  const { showSettingsModal, closeSettings } = useSettings();

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
          
          {/* Tema */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Tema</h4>
              <p className="text-sm text-gray-600">Personaliza la apariencia de la aplicación</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg">
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
              <h4 className="font-medium text-gray-900">Auto-guardado</h4>
              <p className="text-sm text-gray-600">Guarda automáticamente tu trabajo</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
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