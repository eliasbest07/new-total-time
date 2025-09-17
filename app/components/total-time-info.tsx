'use client'
import React from 'react';
import { Clock, Zap, BarChart3, Moon, Sun, Settings } from 'lucide-react';
import Image from 'next/image';
import { useSettings } from '../contexts/SettingsContext';

const TotalTimeNavbar = () => {
  const { openSettings } = useSettings();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo y título */}
          <button 
            onClick={() => window.location.href = '/demo'}
            className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 transition-colors duration-200"
          >
            <div className="rounded-xl">
              <Image 
                src="/total-time_logo.svg" 
                alt="Total Time Logo" 
                width={34} 
                height={34} 
                className="w-10 h-10 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Total-Time</h1>
              <p className="text-xs text-gray-500">total-time.app</p>
            </div>
          </button>

          {/* Características - Desktop */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-blue-50 rounded-lg p-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-700 hidden xl:inline">Seguimiento en tiempo real</span>
              <span className="text-gray-700 lg:inline xl:hidden">Tiempo real</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-purple-50 rounded-lg p-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-gray-700 hidden xl:inline">Análisis detallado</span>
              <span className="text-gray-700 lg:inline xl:hidden">Análisis</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-indigo-50 rounded-lg p-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-gray-700 hidden xl:inline">Optimización automática</span>
              <span className="text-gray-700 lg:inline xl:hidden">Optimización</span>
            </div>
          </div>

          {/* Status y conexión */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
            {/* Estado del sistema */}
            <div className="hidden lg:flex items-center space-x-2">
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                Activo
              </span>
            </div>
            
            {/* Theme Toggle Button */}
            <button 
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group"
              title="Cambiar tema"
            >
              <Sun className="w-4 h-4 text-gray-600 group-hover:text-gray-800 block dark:hidden" />
              <Moon className="w-4 h-4 text-gray-600 group-hover:text-gray-800 hidden dark:block" />
            </button>
            
            {/* Botón de configuraciones */}
            <button 
              onClick={openSettings}
              className="flex items-center space-x-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 group"
              title="Configuraciones"
            >
              <Settings className="w-4 h-4 text-gray-600 group-hover:text-gray-800" />
              <span className="text-sm text-gray-600 group-hover:text-gray-800 hidden sm:inline">Configuraciones</span>
            </button>
            
            {/* Copyright */}
            <div className="hidden 2xl:block">
              <p className="text-xs text-gray-400">
                © 2025 Total Time App
              </p>
            </div>
          </div>
        </div>

      </div>
    </nav>
  );
};

export default TotalTimeNavbar;