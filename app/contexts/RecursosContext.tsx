"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Recurso } from '@/domain/entities/Recurso';
import { SupabaseRecursoRepository } from '@/infrastructure/datasource/SupabaseRecursoRepository';
import { retrySupabaseOperation } from '@/utils/retryWithBackoff';
import { useAuth } from './AuthContext';

interface RecursosContextType {
  recursos: Recurso[];
  loading: boolean;
  error: string | null;
  createRecurso: (recursoData: Omit<Recurso, 'id' | 'created_at'>) => Promise<Recurso>;
  updateRecurso: (id: number, recursoData: Partial<Recurso>) => Promise<Recurso>;
  deleteRecurso: (id: number) => Promise<boolean>;
  refetch: () => Promise<void>;
}

const RecursosContext = createContext<RecursosContextType | undefined>(undefined);

export const RecursosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  const { usuario } = useAuth();
  const recursoRepository = new SupabaseRecursoRepository();

  const loadRecursos = useCallback(async () => {
    // No cargar recursos si no hay usuario autenticado
    if (!usuario?.id) {
      setRecursos([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const recursosData = await retrySupabaseOperation(
        () => recursoRepository.getRecursosByUsuario(usuario.id),
        'Cargar recursos'
      );
      setRecursos(recursosData);
    } catch (err) {
      console.error('📚 RecursosContext - Error cargando recursos:', err);
      setError('Error al cargar recursos');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id]);

  const createRecurso = async (recursoData: Omit<Recurso, 'id' | 'created_at'>) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const nuevoRecurso = await retrySupabaseOperation(
        () => recursoRepository.createRecurso(recursoData),
        'Crear recurso'
      );
      if (nuevoRecurso) {
        // Actualizar la lista localmente
        setRecursos(prev => [nuevoRecurso, ...prev]);
        return nuevoRecurso;
      }
      throw new Error('No se pudo crear el recurso');
    } catch (err) {
      console.error('Error creando recurso:', err);
      setError('Error al crear recurso');
      throw err;
    }
  };

  const updateRecurso = async (id: number, recursoData: Partial<Recurso>) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const recursoActualizado = await retrySupabaseOperation(
        () => recursoRepository.updateRecurso(id, recursoData),
        'Actualizar recurso'
      );
      if (recursoActualizado) {
        // Actualizar la lista localmente
        setRecursos(prev => prev.map(r => r.id === id ? recursoActualizado : r));
        return recursoActualizado;
      }
      throw new Error('No se pudo actualizar el recurso');
    } catch (err) {
      console.error('Error actualizando recurso:', err);
      setError('Error al actualizar recurso');
      throw err;
    }
  };

  const deleteRecurso = async (id: number) => {
    if (!usuario) {
      throw new Error('Usuario no autenticado');
    }
    
    try {
      const success = await retrySupabaseOperation(
        () => recursoRepository.deleteRecurso(id),
        'Eliminar recurso'
      );
      if (success) {
        // Actualizar la lista localmente
        setRecursos(prev => prev.filter(r => r.id !== id));
        return true;
      }
      throw new Error('No se pudo eliminar el recurso');
    } catch (err) {
      console.error('Error eliminando recurso:', err);
      setError('Error al eliminar recurso');
      throw err;
    }
  };

  // Marcar que hemos verificado la autenticación
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300); // Delay ligeramente mayor que otros contextos
    
    return () => clearTimeout(timer);
  }, []);

  // Cargar recursos cuando la autenticación esté verificada
  useEffect(() => {
    if (authChecked) {
      loadRecursos();
    }
  }, [authChecked, loadRecursos]);

  const value: RecursosContextType = {
    recursos,
    loading: !authChecked || loading,
    error,
    createRecurso,
    updateRecurso,
    deleteRecurso,
    refetch: loadRecursos
  };

  return (
    <RecursosContext.Provider value={value}>
      {children}
    </RecursosContext.Provider>
  );
};

export const useRecursosContext = (): RecursosContextType => {
  const context = useContext(RecursosContext);
  if (context === undefined) {
    throw new Error('useRecursosContext must be used within a RecursosProvider');
  }
  return context;
};