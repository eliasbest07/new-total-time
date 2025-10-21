import React, { useEffect, useState } from 'react';
import { useMisionActiva } from '@/hooks/useMisionActiva';
import { useAuth } from '@/app/contexts/AuthContext';
import { MisionActiva } from '@/domain/entities/MisionActiva';

interface EntregasVentanaProps {
  onClose?: () => void;
}

export default function EntregasVentana({ onClose }: EntregasVentanaProps) {
  const { usuario } = useAuth();
  const { getMisionesEntregadas, loading } = useMisionActiva();
  const [entregadas, setEntregadas] = useState<MisionActiva[]>([]);

  useEffect(() => {
    if (usuario?.id) {
      loadEntregas();
    }
  }, [usuario?.id]);

  const loadEntregas = async () => {
    if (!usuario?.id) return;
    const data = await getMisionesEntregadas(usuario.id);
    setEntregadas(data);
  };

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando entregas...</p>
        </div>
      </div>
    );
  }

  if (entregadas.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay entregas</h3>
          <p className="text-gray-500">Aún no has entregado ninguna misión o actividad</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Entregas Realizadas</h2>
        <p className="text-gray-600">Total de entregas: {entregadas.length}</p>
      </div>

      {/* Lista de entregas */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {entregadas.map((entrega) => (
          <div
            key={entrega.id}
            className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow p-5"
          >
            {/* Header de la entrega */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    entrega.tipo === 'mision'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {entrega.tipo === 'mision' ? '🎯 Misión' : '📅 Actividad'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                    ⏱️ {formatTime(entrega.tiempo_total_segundos)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  ID de referencia: {entrega.id_referencia}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Fecha de entrega</p>
                <p className="text-sm font-medium text-gray-700">
                  {formatDate(entrega.fecha_entrega)}
                </p>
              </div>
            </div>

            {/* Descripción de la entrega */}
            {entrega.entrega_descripcion && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📝 Descripción</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {entrega.entrega_descripcion}
                  </p>
                </div>
              </div>
            )}

            {/* Imágenes de la entrega */}
            {entrega.entrega_imagen_url && entrega.entrega_imagen_url.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">📸 Imágenes</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {entrega.entrega_imagen_url.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <img
                        src={url}
                        alt={`Entrega imagen ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capturas durante la ejecución */}
            {entrega.capturas_urls && entrega.capturas_urls.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  🖼️ Capturas de pantalla ({entrega.capturas_urls.length})
                </h4>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {entrega.capturas_urls.slice(0, 6).map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(url, '_blank')}
                      title="Click para ver en tamaño completo"
                    >
                      <img
                        src={url}
                        alt={`Captura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {entrega.capturas_urls.length > 6 && (
                    <div className="relative aspect-square rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-600 text-xs font-semibold">
                        +{entrega.capturas_urls.length - 6}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Información adicional */}
            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500">Fecha de inicio:</span>
                <p className="font-medium text-gray-700">
                  {formatDate(entrega.fecha_inicio)}
                </p>
              </div>
              {entrega.calificacion !== null && (
                <div>
                  <span className="text-gray-500">Calificación:</span>
                  <p className="font-medium text-gray-700">
                    {entrega.calificacion}/100
                  </p>
                </div>
              )}
            </div>

            {/* Comentarios del revisor */}
            {entrega.comentarios_entrega && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">💬 Comentarios del revisor</h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-blue-900">{entrega.comentarios_entrega}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
