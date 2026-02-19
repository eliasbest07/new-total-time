'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePizarraProyecto } from '@/hooks/usePizarraProyecto';
import { usePizarraOrganizacionPermisos } from '@/hooks/usePizarraOrganizacionPermisos';
import Pizarra, { PizarraRef } from '@/application/pizarra/pizarra';
import { ArrowLeft, Layout, Edit3, Eye } from 'lucide-react';
import { supabase } from '@/infrastructure/services/SupabaseClient';

export default function PizarraProyectoPage() {
  const router = useRouter();
  const params = useParams();
  const { usuario } = useAuth();
  const pizarraRef = useRef<PizarraRef>(null);

  const idProyecto = params?.id_proyecto ? parseInt(params.id_proyecto as string) : null;
  const idOrganizacion = usuario?.idOrganizacion || null;
  const idUsuario = usuario?.id ? parseInt(usuario.id) : null;

  const [isReady, setIsReady] = useState(false);
  const [nombreProyecto, setNombreProyecto] = useState<string>('');

  const { pizarra, loading: loadingPizarra, error: errorPizarra } = usePizarraProyecto(
    idOrganizacion,
    idProyecto
  );

  const { puedeEditar, loading: loadingPermisos } = usePizarraOrganizacionPermisos(
    idOrganizacion,
    idUsuario
  );

  // Cargar nombre del proyecto
  useEffect(() => {
    if (!idProyecto) return;
    supabase
      .from('proyectos')
      .select('nombre')
      .eq('id', idProyecto)
      .single()
      .then(({ data }) => {
        if (data?.nombre) setNombreProyecto(data.nombre);
      });
  }, [idProyecto]);

  useEffect(() => {
    if (!usuario || !idOrganizacion || !idProyecto) return;
    setIsReady(true);
  }, [usuario, idOrganizacion, idProyecto]);

  if (!usuario || !idOrganizacion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!idProyecto) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Proyecto no encontrado</p>
      </div>
    );
  }

  if (loadingPizarra || loadingPermisos || !isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando pizarra del proyecto...</p>
        </div>
      </div>
    );
  }

  if (errorPizarra || !pizarra) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center p-8 bg-white rounded-lg shadow">
          <p className="text-gray-600 mb-4">{errorPizarra || 'No se pudo cargar la pizarra'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Volver
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
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Layout className="h-6 w-6 text-blue-600" />
              {nombreProyecto || `Proyecto ${idProyecto}`}
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
                  Solo lectura
                </span>
              )}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${puedeEditar ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {puedeEditar ? 'Editor' : 'Visualizador'}
        </div>
      </div>

      {/* Pizarra */}
      <div className="flex-1 relative">
        <Pizarra
          ref={pizarraRef}
          storagePrefix={`proyecto-${idProyecto}`}
          fullMode={true}
          lightMode={false}
          isOrganizacionPizarra={true}
          readOnly={!puedeEditar}
          pizarraOrganizacion={pizarra}
        />
      </div>
    </div>
  );
}
