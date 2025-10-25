"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Proyecto } from '@/domain/entities/Proyecto';
import { SupabaseProyectoRepository } from '@/infrastructure/datasource/SupabaseProyectoRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';
import { queueSupabaseOperation } from '@/utils/requestQueue';
import { useAuth } from './AuthContext';

interface ProyectosContextType {
  proyectos: Proyecto[];
  loading: boolean;
  error: string | null;
  createProyecto: (proyectoData: Omit<Proyecto, 'id' | 'created_at'>) => Promise<Proyecto>;
  updateProyecto: (id: number, proyectoData: Partial<Proyecto>) => Promise<Proyecto>;
  deleteProyecto: (id: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const ProyectosContext = createContext<ProyectosContextType | undefined>(undefined);

export const ProyectosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const { usuario } = useAuth();
  const proyectoRepository = new SupabaseProyectoRepository();

  const loadProyectos = useCallback(async () => {
    // No cargar proyectos si no hay usuario autenticado
    if (!usuario) {
      setProyectos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const proyectosData = await queueSupabaseOperation(
        () => retrySupabaseOperation(
          () => proyectoRepository.getProyectosByCurrentUser(),
          'Cargar proyectos'
        ),
        'Cargar proyectos',
        1 // Alta prioridad para carga inicial
      );
      setProyectos(proyectosData);
    } catch (err) {
      console.error('📁 ProyectosContext - Error cargando proyectos:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
    }
  }, [usuario]);

  const createProyecto = async (proyectoData: Omit<Proyecto, 'id' | 'created_at'>) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const nuevoProyecto = await retrySupabaseOperation(
        () => proyectoRepository.createProyecto(proyectoData),
        'Crear proyecto'
      );
      if (nuevoProyecto) {
        // Actualizar la lista localmente en lugar de recargar
        setProyectos(prev => [nuevoProyecto, ...prev]);
        return nuevoProyecto;
      }
      throw new Error('No se pudo crear el proyecto');
    } catch (err) {
      console.error('Error creando proyecto:', err);
      setError('Error al crear proyecto');
      throw err;
    }
  };

  const updateProyecto = async (id: number, proyectoData: Partial<Proyecto>) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const proyectoActualizado = await retrySupabaseOperation(
        () => proyectoRepository.updateProyecto(id, proyectoData),
        'Actualizar proyecto'
      );
      if (proyectoActualizado) {
        // Actualizar la lista localmente
        setProyectos(prev => prev.map(p => p.id === id ? proyectoActualizado : p));
        return proyectoActualizado;
      }
      throw new Error('No se pudo actualizar el proyecto');
    } catch (err) {
      console.error('Error actualizando proyecto:', err);
      setError('Error al actualizar proyecto');
      throw err;
    }
  };

  const deleteProyecto = async (id: number) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const success = await retrySupabaseOperation(
        () => proyectoRepository.deleteProyecto(id),
        'Eliminar proyecto'
      );
      if (success) {
        // Actualizar la lista localmente
        setProyectos(prev => prev.filter(p => p.id !== id));
        return true;
      }
      throw new Error('No se pudo eliminar el proyecto');
    } catch (err) {
      console.error('Error eliminando proyecto:', err);
      setError('Error al eliminar proyecto');
      throw err;
    }
  };

  // Marcar que hemos verificado la autenticación
  useEffect(() => {
    // Dar un pequeño delay para que el AuthContext se inicialice
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Cargar proyectos cuando la autenticación esté verificada
  useEffect(() => {
    if (authChecked) {
      loadProyectos();
    }
  }, [authChecked, loadProyectos]);

  const value: ProyectosContextType = {
    proyectos,
    loading: !authChecked || loading, // Mostrar loading mientras se verifica auth o se cargan proyectos
    error,
    createProyecto,
    updateProyecto,
    deleteProyecto,
    refetch: loadProyectos
  };

  return (
    <ProyectosContext.Provider value={value}>
      {children}
    </ProyectosContext.Provider>
  );
};

export const useProyectosContext = (): ProyectosContextType => {
  const context = useContext(ProyectosContext);
  if (context === undefined) {
    throw new Error('useProyectosContext must be used within a ProyectosProvider');
  }
  return context;
};