'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePizarraOrganizacion } from '@/hooks/usePizarraOrganizacion';
import { usePizarraOrganizacionPermisos } from '@/hooks/usePizarraOrganizacionPermisos';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import InputArea from '@/app/components/mainUI/InputArea';
import { ArrowLeft, Lock, Users, Edit3, Eye } from 'lucide-react';

/**
 * Página de la Pizarra de Organización
 *
 * Esta pizarra es permanente y compartida por todos los miembros de la organización.
 * A diferencia de la pizarra personal, NO se renueva diariamente.
 *
 * Permisos:
 * - Todos los miembros pueden VER la pizarra
 * - Solo usuarios autorizados pueden EDITAR
 * - El admin de la organización siempre puede editar
 */
export default function PizarraOrganizacionPage() {
  const router = useRouter();
  const { usuario } = useAuth();
  const pizarraRef = useRef<PizarraRef>(null);

  const [mensajeEnviado, setMensajeEnviado] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Obtener ID de organización del usuario actual
  const idOrganizacion = usuario?.idOrganizacion || null;
  const idUsuario = usuario?.id ? parseInt(usuario.id) : null;

  // Hooks para cargar pizarra y verificar permisos
  const { pizarra, loading: loadingPizarra, error: errorPizarra } = usePizarraOrganizacion(idOrganizacion);
  const { puedeEditar, loading: loadingPermisos } = usePizarraOrganizacionPermisos(
    idOrganizacion,
    idUsuario
  );
  const { verificarMisionesInactivas } = useMisionActiva();

  // Debug logs
  useEffect(() => {
    console.log('🏢 [PizarraOrg] Usuario:', {
      id: usuario?.id,
      idOrganizacion: usuario?.idOrganizacion,
      email: usuario?.email
    });
    console.log('🏢 [PizarraOrg] Estado:', {
      pizarra: pizarra?.id,
      puedeEditar,
      loadingPizarra,
      loadingPermisos
    });
  }, [usuario, pizarra, puedeEditar, loadingPizarra, loadingPermisos]);

  // Verificar que el usuario pertenece a una organización
  useEffect(() => {
    if (!usuario) {
      console.log('🏢 [PizarraOrg] Usuario no autenticado');
      return;
    }

    if (!idOrganizacion) {
      console.warn('⚠️ [PizarraOrg] Usuario no pertenece a ninguna organización');
      // Podríamos redirigir o mostrar mensaje
      return;
    }

    console.log('✅ [PizarraOrg] Usuario autenticado y en organización:', idOrganizacion);
    setIsReady(true);
  }, [usuario, idOrganizacion]);

  // Verificar periódicamente misiones inactivas (cada 2 minutos)
  useEffect(() => {
    if (!isReady || !pizarra) return;

    console.log('🔄 [PizarraOrg] Iniciando verificación periódica de misiones inactivas');

    // Ejecutar inmediatamente al montar
    verificarMisionesInactivas();

    // Luego cada 2 minutos
    const intervalo = setInterval(() => {
      console.log('🔄 [PizarraOrg] Verificando misiones inactivas...');
      verificarMisionesInactivas();
    }, 2 * 60 * 1000); // 2 minutos

    return () => {
      console.log('🔕 [PizarraOrg] Deteniendo verificación periódica de misiones inactivas');
      clearInterval(intervalo);
    };
  }, [isReady, pizarra, verificarMisionesInactivas]);

  // Handlers
  const handleVolver = () => {
    router.push('/dashboard');
  };

  const handleMensajeEnviado = () => {
    setMensajeEnviado(true);
    setTimeout(() => setMensajeEnviado(false), 2000);
  };

  // Estados de carga
  if (!usuario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando usuario...</p>
        </div>
      </div>
    );
  }

  if (!idOrganizacion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center p-8 bg-white rounded-lg shadow">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Sin Organización
          </h2>
          <p className="text-gray-600 mb-6">
            No perteneces a ninguna organización. La pizarra de organización es un
            espacio compartido para miembros de una organización.
          </p>
          <button
            onClick={handleVolver}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loadingPizarra || loadingPermisos || !isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando pizarra de organización...</p>
        </div>
      </div>
    );
  }

  if (errorPizarra || !pizarra) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center p-8 bg-white rounded-lg shadow">
          <Lock className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Error al Cargar Pizarra
          </h2>
          <p className="text-gray-600 mb-6">
            {errorPizarra || 'No se pudo cargar la pizarra de la organización'}
          </p>
          <button
            onClick={handleVolver}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleVolver}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Pizarra de Organización
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {puedeEditar ? (
                <span className="flex items-center gap-1">
                  <Edit3 className="h-3 w-3" />
                  Puedes editar esta pizarra
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Solo lectura • Contacta al admin para obtener permisos de edición
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge de estado */}
          <div className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${puedeEditar
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            {puedeEditar ? 'Editor' : 'Visualizador'}
          </div>
        </div>
      </div>

      {/* Pizarra */}
      <div className="flex-1 relative">
        <Pizarra
          ref={pizarraRef}
          storagePrefix="organizacion" // Prefijo diferente para localStorage
          fullMode={true}
          lightMode={false}
          isOrganizacionPizarra={true} // Nueva prop para indicar que es pizarra de org
          readOnly={!puedeEditar} // Solo lectura si no tiene permisos
          pizarraOrganizacion={pizarra} // Pasar objeto de pizarra para guardado
        />
      </div>

      {/* Input Area - Solo visible si tiene permisos de edición */}
      {puedeEditar && (
        <div className="border-t border-gray-200 bg-white">
          <InputArea />
        </div>
      )}

      {/* Mensaje de confirmación */}
      {mensajeEnviado && (
        <div className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Mensaje enviado</span>
        </div>
      )}
    </div>
  );
}
