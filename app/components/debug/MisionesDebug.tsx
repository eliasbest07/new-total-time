"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useUsuarioId } from '@/hooks/useUsuarioId';
import { useMisiones } from '@/hooks/useMisiones';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { Mision } from '@/domain/entities/Mision';

interface UsuarioTabla {
  id: number;
  id_usuario: string;
  [key: string]: unknown;
}

interface MisionRaw {
  id: number;
  id_usuario: number;
  [key: string]: unknown;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

interface DebugInfo {
  usuarioAuth?: {
    id: string;
    email: string;
    nombre: string;
  };
  usuarioTabla?: UsuarioTabla | null;
  usuarioError?: SupabaseError | null;
  todasMisiones?: MisionRaw[] | null;
  misionesError?: SupabaseError | null;
  misionesFiltradas?: MisionRaw[] | null;
  hookUsuarioId?: number | null;
  hookMisiones?: Mision[];
  loadingUsuario?: boolean;
  loadingMisiones?: boolean;
  errorUsuario?: string | null;
  errorMisiones?: string | null;
  error?: string;
}

export default function MisionesDebug() {
  const { usuario } = useAuth();
  const { usuarioId, loading: loadingUsuario, error: errorUsuario } = useUsuarioId();
  const { misiones, loading: loadingMisiones, error: errorMisiones } = useMisiones(usuarioId);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});

  useEffect(() => {
    const getDebugInfo = async () => {
      if (!usuario?.id) return;

      try {
        // 1. Verificar datos del usuario en la tabla usuario
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuario')
          .select('*')
          .eq('id_usuario', usuario.id)
          .single();

        // 2. Obtener todas las misiones sin filtro
        const { data: todasMisiones, error: misionesError } = await supabase
          .from('misiones')
          .select('*');

        // 3. Obtener misiones filtradas por el ID numérico si existe
        let misionesFiltradas = null;
        if (usuarioData?.id) {
          const { data: filtradas, error: filtradasError } = await supabase
            .from('misiones')
            .select('*')
            .eq('id_usuario', usuarioData.id);
          misionesFiltradas = filtradas;
        }

        setDebugInfo({
          usuarioAuth: {
            id: usuario.id,
            email: usuario.email,
            nombre: usuario.getNombreCompleto()
          },
          usuarioTabla: usuarioData,
          usuarioError,
          todasMisiones,
          misionesError,
          misionesFiltradas,
          hookUsuarioId: usuarioId,
          hookMisiones: misiones,
          loadingUsuario,
          loadingMisiones,
          errorUsuario,
          errorMisiones
        });
      } catch (error) {
        console.error('Error en debug:', error);
        setDebugInfo({ 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
      }
    };

    getDebugInfo();
  }, [usuario, usuarioId, misiones, loadingUsuario, loadingMisiones, errorUsuario, errorMisiones]);

  return (
    <div className="bg-black/80 text-white p-6 rounded-lg max-w-4xl mx-auto mt-8 text-xs">
      <h2 className="text-xl font-bold mb-4 text-yellow-400">🐛 Debug Misiones</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-400">1. Usuario Auth (Contexto)</h3>
          <pre className="bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(debugInfo.usuarioAuth, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-green-400">2. Usuario Tabla (Base de datos)</h3>
          <pre className="bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(debugInfo.usuarioTabla, null, 2)}
          </pre>
          {debugInfo.usuarioError && (
            <p className="text-red-400">Error: {JSON.stringify(debugInfo.usuarioError)}</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-purple-400">3. Todas las Misiones</h3>
          <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-40">
            {JSON.stringify(debugInfo.todasMisiones, null, 2)}
          </pre>
          {debugInfo.misionesError && (
            <p className="text-red-400">Error: {JSON.stringify(debugInfo.misionesError)}</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-orange-400">4. Misiones Filtradas</h3>
          <pre className="bg-gray-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(debugInfo.misionesFiltradas, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-cyan-400">5. Hooks Estado</h3>
          <div className="bg-gray-800 p-2 rounded">
            <p><strong>Hook usuarioId:</strong> {debugInfo.hookUsuarioId}</p>
            <p><strong>Hook misiones:</strong> {debugInfo.hookMisiones?.length || 0} misiones</p>
            <p><strong>Loading Usuario:</strong> {debugInfo.loadingUsuario ? 'Sí' : 'No'}</p>
            <p><strong>Loading Misiones:</strong> {debugInfo.loadingMisiones ? 'Sí' : 'No'}</p>
            <p><strong>Error Usuario:</strong> {debugInfo.errorUsuario || 'Ninguno'}</p>
            <p><strong>Error Misiones:</strong> {debugInfo.errorMisiones || 'Ninguno'}</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-pink-400">6. Estructura Esperada</h3>
          <div className="bg-gray-800 p-2 rounded text-sm">
            <p><strong>Tabla usuario:</strong></p>
            <p>- id (bigint) ← ID numérico interno</p>
            <p>- id_usuario (uuid) ← Referencia a auth.users</p>
            <br />
            <p><strong>Tabla misiones:</strong></p>
            <p>- id_usuario (bigint) ← Debe referenciar usuario.id</p>
            <br />
            <p><strong>Flujo correcto:</strong></p>
            <p>1. Auth UUID → Buscar en usuario.id_usuario</p>
            <p>2. Obtener usuario.id (bigint)</p>
            <p>3. Filtrar misiones por usuario.id</p>
          </div>
        </div>
      </div>
    </div>
  );
}