'use client'
import React from 'react';
import { Clock, Zap, BarChart3, Moon, Sun } from 'lucide-react';
import Image from 'next/image';

const TotalTimeNavbar = () => {
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
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-blue-50 rounded-lg p-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-gray-700">Seguimiento en tiempo real</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-purple-50 rounded-lg p-1.5">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-gray-700">Análisis detallado</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className="bg-indigo-50 rounded-lg p-1.5">
                <Zap className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-gray-700">Optimización automática</span>
            </div>
          </div>

          {/* Status y conexión */}
          <div className="flex items-center space-x-4">
            {/* Estado del sistema */}
            <div className="hidden md:flex items-center space-x-2">
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
            
            {/* Indicador de conexión */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600 hidden sm:inline">Conectado</span>
            </div>
            
            {/* Copyright */}
            <div className="hidden xl:block">
              <p className="text-xs text-gray-400">
                © 2025 Total Time App
              </p>
            </div>
          </div>
        </div>

        {/* Mobile features - Expandible */}
        <div className="lg:hidden border-t border-gray-100 py-2">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center space-x-2 text-xs">
              <div className="bg-blue-50 rounded p-1">
                <Clock className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-gray-700">Tiempo real</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <div className="bg-purple-50 rounded p-1">
                <BarChart3 className="w-3 h-3 text-purple-600" />
              </div>
              <span className="text-gray-700">Análisis</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs">
              <div className="bg-indigo-50 rounded p-1">
                <Zap className="w-3 h-3 text-indigo-600" />
              </div>
              <span className="text-gray-700">Optimización</span>
            </div>
            
            <div className="flex items-center space-x-2 text-xs ml-auto">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                Activo
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TotalTimeNavbar;