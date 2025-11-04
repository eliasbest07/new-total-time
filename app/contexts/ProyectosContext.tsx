"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
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
  lastUpdated: number | null;
}

const ProyectosContext = createContext<ProyectosContextType | undefined>(undefined);

// Tiempo de caché en milisegundos (5 minutos)
const CACHE_DURATION = 5 * 60 * 1000;

export const ProyectosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const { usuario } = useAuth();
  const proyectoRepository = new SupabaseProyectoRepository();
  const isLoadingRef = useRef(false); // Evitar cargas duplicadas

  const loadProyectos = useCallback(async (forceRefresh = false) => {
    // No cargar proyectos si no hay usuario autenticado
    if (!usuario) {
      setProyectos([]);
      setLoading(false);
      return;
    }

    // Evitar cargas duplicadas simultáneas
    if (isLoadingRef.current && !forceRefresh) {
      console.log('📁 Ya hay una carga en progreso, saltando...');
      return;
    }

    // Verificar si el caché es válido (menos de 5 minutos)
    const now = Date.now();
    if (!forceRefresh && lastUpdated && (now - lastUpdated) < CACHE_DURATION) {
      console.log('📁 Usando caché de proyectos (válido por', Math.round((CACHE_DURATION - (now - lastUpdated)) / 1000), 'segundos más)');
      setLoading(false);
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('📁 Cargando proyectos desde Supabase...');
      const proyectosData = await queueSupabaseOperation(
        () => retrySupabaseOperation(
          () => proyectoRepository.getProyectosByCurrentUser(),
          'Cargar proyectos'
        ),
        'Cargar proyectos',
        1 // Alta prioridad para carga inicial
      );

      setProyectos(proyectosData);
      setLastUpdated(Date.now());
      console.log('✅ Proyectos cargados y cacheados:', proyectosData.length);
    } catch (err) {
      console.error('📁 ProyectosContext - Error cargando proyectos:', err);
      setError('Error al cargar proyectos');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [usuario, lastUpdated]);

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
        // Actualizar timestamp del caché
        setLastUpdated(Date.now());
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
        // Actualizar timestamp del caché
        setLastUpdated(Date.now());
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
        // Actualizar timestamp del caché
        setLastUpdated(Date.now());
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
    refetch: () => loadProyectos(true), // Forzar recarga ignorando caché
    lastUpdated
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