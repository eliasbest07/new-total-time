'use client';

import { useState, useCallback } from 'react';

import React from 'react';

export interface VentanaConfig {
  id: string;
  title: string;
  content: React.ReactNode;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  draggable?: boolean;
  className?: string;
}

export const useVentanas = () => {
  const [ventanas, setVentanas] = useState<VentanaConfig[]>([]);

  const abrirVentana = useCallback((config: VentanaConfig) => {
    setVentanas(prev => {
      // Si ya existe una ventana con el mismo ID, la reemplaza
      const exists = prev.find(v => v.id === config.id);
      if (exists) {
        return prev.map(v => v.id === config.id ? config : v);
      }
      return [...prev, config];
    });
  }, []);

  const cerrarVentana = useCallback((id: string) => {
    setVentanas(prev => prev.filter(v => v.id !== id));
  }, []);

  const cerrarTodasLasVentanas = useCallback(() => {
    setVentanas([]);
  }, []);

  const obtenerVentana = useCallback((id: string) => {
    return ventanas.find(v => v.id === id);
  }, [ventanas]);

  return {
    ventanas,
    abrirVentana,
    cerrarVentana,
    cerrarTodasLasVentanas,
    obtenerVentana
  };
};