'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import { useRef } from 'react';
import { ArrowLeft, Edit3, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePizarraPermissions } from '@/hooks/usePizarraPermissions';
import InputArea from '@/app/components/mainUI/InputArea';

export default function PizarraUsuarioPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const pizarraRef = useRef<PizarraRef>(null);
  const [userName, setUserName] = useState<string>('Usuario');
  const [ownerNumericId, setOwnerNumericId] = useState<number | null>(null);
  const { usuario } = useAuth();

  // Debug: Verificar qué viene en los params
  useEffect(() => {
    console.log('🔍 [DEBUG] Params completos:', params);
    console.log('🔍 [DEBUG] userId extraído:', userId);
    console.log('🔍 [DEBUG] Tipo de userId:', typeof userId);
    console.log('🔍 [DEBUG] userId es undefined?', userId === undefined);
    console.log('🔍 [DEBUG] userId es null?', userId === null);
    console.log('🔍 [DEBUG] userId length:', userId?.length);
  }, [params, userId]);

  // Hook para manejar permisos
  const {
    hasPermission,
    isPending,
    loading: permissionLoading,
    requestPermission
  } = usePizarraPermissions(ownerNumericId, usuario?.id || null);

  // Cargar información del usuario desde Supabase
  useEffect(() => {
    const loadUserInfo = async () => {
      console.log('🔍 [Page] loadUserInfo iniciado');
      console.log('🔍 [Page] userId antes de la query:', userId);
      console.log('🔍 [Page] userId type:', typeof userId);
      console.log('🔍 [Page] userId es truthy?', !!userId);

      if (!userId) {
        console.warn('⚠️ [Page] userId está vacío, no se ejecutará la query');
        return;
      }

      try {
        console.log('🔍 [Page] Buscando usuario con id_usuario:', userId);
        const { supabase } = await import('@/infrastructure/services/SupabaseClient');

        console.log('🔍 [Page] Supabase client obtenido, ejecutando query...');
        const { data, error } = await supabase
          .from('usuario')
          .select('id, nombre, username, correo, id_usuario')
          .eq('id_usuario', userId)
          .maybeSingle();

        console.log('🔍 [Page] Query ejecutada. Data:', data, 'Error:', error);

        if (error) {
          console.error('❌ [Page] Error cargando información del usuario:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            userId: userId,
            errorCompleto: JSON.stringify(error)
          });
          return;
        }

        if (data) {
          console.log('✅ [Page] Usuario encontrado:', {
            id: data.id,
            nombre: data.nombre || data.username,
            id_usuario: data.id_usuario
          });
          setUserName(data.nombre || data.username || data.correo || 'Usuario');
          setOwnerNumericId(parseInt(data.id));
        } else {
          console.warn('⚠️ [Page] No hay error pero tampoco hay data');
        }
      } catch (error) {
        console.error('❌ [Page] Error en loadUserInfo (catch):', error);
      }
    };

    console.log('🔍 [Page] useEffect ejecutándose con userId:', userId);
    if (userId) {
      loadUserInfo();
    } else {
      console.warn('⚠️ [Page] useEffect: userId es falsy, no se carga nada');
    }
  }, [userId]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Header con botón de regreso y controles */}
      <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white rounded-lg transition-all duration-200 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Volver</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
            <h1 className="text-white font-semibold text-lg">
              Pizarra de {userName}
            </h1>
          </div>
        </div>

        {/* Botón de solicitud de permiso */}
        <div className="flex items-center gap-3">
          {!hasPermission && !isPending && (
            <button
              onClick={requestPermission}
              disabled={permissionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
            >
              <Edit3 className="w-5 h-5" />
              <span>Solicitar Permiso de Edición</span>
            </button>
          )}

          {isPending && (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg shadow-lg">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-medium">Solicitud Pendiente</span>
            </div>
          )}

          {hasPermission && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Permiso de Edición Otorgado</span>
            </div>
          )}
        </div>
      </div>

      {/* Pizarra del usuario - modo solo lectura */}
      <div className="w-full h-full">
        <Pizarra
          ref={pizarraRef}
          storagePrefix={`user-${userId}`}
          viewingUserId={userId}
          onShowScreenshots={() => {}}
        />
      </div>

      {/* InputArea - Solo si tiene permiso */}
      {hasPermission && (
        <InputArea
          onCreateNote={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addNoteCard(text);
            }
          }}
          onCreateTodoList={(text) => {
            if (pizarraRef.current) {
              pizarraRef.current.addTodoCard(text);
            }
          }}
          onSendToUser={(text, user) => {
            // Implementar envío a chat si es necesario
            console.log('Enviar a usuario:', user, text);
          }}
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          placeholder="Escribe aquí para crear notas, tareas o enviar..."
        />
      )}

      {/* Info flotante */}
      <div className="absolute bottom-4 right-4 z-50 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
        <p className="text-white text-sm">
          {hasPermission
            ? 'Vista de pizarra compartida - Modo edición'
            : 'Vista de pizarra compartida - Solo lectura'}
        </p>
      </div>
    </div>
  );
}
