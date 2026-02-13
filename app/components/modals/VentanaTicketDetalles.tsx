'use client';

import { useState, useEffect } from 'react';
import Ventana from '@/app/demo/components/Ventana';
import { Mision } from '@/domain/entities/Mision';
import { Usuario } from '@/domain/entities/Usuario';
import { Capture } from '@/domain/entities/Capture';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';

const captureRepository = new CaptureRepositorySupabase();

interface VentanaTicketDetallesProps {
  isOpen: boolean;
  onClose: () => void;
  mision: Mision | null;
  usuarios: Usuario[];
  currentUserId?: string;
  onOpenChat?: (userId: string, initialMessage: string) => void;
}

const formatDate = (fecha: string | null) => {
  if (!fecha) return 'Sin fecha';
  return new Date(fecha).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function VentanaTicketDetalles({
  isOpen,
  onClose,
  mision,
  usuarios,
  currentUserId,
  onOpenChat,
}: VentanaTicketDetallesProps) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loadingCaptures, setLoadingCaptures] = useState(false);
  const [chatMessage, setChatMessage] = useState('');

  // Resolver usuario asignado
  const usuarioAsignado = mision?.id_usuario
    ? usuarios.find(u => parseInt(u.id) === mision.id_usuario)
    : null;

  // Cargar capturas cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !mision || !currentUserId) {
      setCaptures([]);
      return;
    }

    const loadCaptures = async () => {
      setLoadingCaptures(true);
      try {
        const data = await captureRepository.getByUsuarioAndBloque(currentUserId, String(mision.id));
        setCaptures(data);
      } catch (error) {
        console.error('Error cargando capturas de misión:', error);
        setCaptures([]);
      } finally {
        setLoadingCaptures(false);
      }
    };

    loadCaptures();
  }, [isOpen, mision?.id, currentUserId]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setChatMessage('');
    }
  }, [isOpen]);

  const handleSendChat = () => {
    if (!chatMessage.trim() || !usuarioAsignado) return;
    onOpenChat?.(usuarioAsignado.userAuth, chatMessage.trim());
    setChatMessage('');
  };

  return (
    <Ventana
      isOpen={isOpen}
      onClose={onClose}
      title="Detalles del ticket"
      initialWidth={600}
      initialHeight={500}
      minWidth={500}
      minHeight={400}
      showOverlay={false}
    >
      {mision && (
        <div className="text-black space-y-6 p-4">
          {/* Nombre */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Nombre</h3>
            <p className="text-gray-700 text-xl font-medium">{mision.nombre || 'Sin nombre'}</p>
          </div>

          {/* Descripción */}
          {mision.descripcion && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Descripción</h3>
              <div className="bg-gray-100 p-3 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{mision.descripcion}</p>
              </div>
            </div>
          )}

          {/* Asignado a */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Asignado a</h3>
            <div className="bg-indigo-100 p-3 rounded-lg">
              {usuarioAsignado ? (
                <div className="flex items-center gap-3">
                  {usuarioAsignado.profile.avatar ? (
                    <img
                      src={usuarioAsignado.profile.avatar}
                      alt={usuarioAsignado.getNombreCompleto()}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {usuarioAsignado.profile.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-indigo-900">{usuarioAsignado.getNombreCompleto()}</p>
                    <p className="text-sm text-indigo-700">@{usuarioAsignado.profile.username}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">
                  {mision.id_usuario ? `Usuario ID: ${mision.id_usuario}` : 'Sin asignar'}
                </p>
              )}
            </div>
          </div>

          {/* Fechas */}
          {(mision.fecha_start || mision.fecha_end) && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Fechas</h3>
              <div className="bg-blue-100 p-3 rounded-lg space-y-2">
                {mision.fecha_start && (
                  <p className="text-blue-800">
                    <span className="font-medium">Inicio:</span> {formatDate(mision.fecha_start)}
                  </p>
                )}
                {mision.fecha_end && (
                  <p className="text-blue-800">
                    <span className="font-medium">Fin:</span> {formatDate(mision.fecha_end)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Horas */}
          {mision.horas && mision.horas > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Duración Estimada</h3>
              <div className="bg-green-100 p-3 rounded-lg">
                <p className="font-medium text-green-800 text-xl">{mision.horas} horas</p>
              </div>
            </div>
          )}

          {/* Estado */}
          {mision.estado && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Estado</h3>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <p className="font-medium text-yellow-800 capitalize">{mision.estado.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          {/* Capturas */}
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Capturas ({captures.length}) - Tiempo: {captures.length * 5} min
            </h3>
            {loadingCaptures ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : captures.length === 0 ? (
              <div className="bg-gray-100 p-3 rounded-lg text-center">
                <p className="text-gray-500 text-sm">No hay capturas para este ticket</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {captures.map((capture) => (
                  <div key={capture.id} className="relative group">
                    <img
                      src={capture.img_url || '/placeholder-image.png'}
                      alt={`Captura ${capture.id}`}
                      className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => capture.img_url && window.open(capture.img_url, '_blank')}
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 truncate">
                      {new Date(capture.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat con responsable */}
          {onOpenChat && usuarioAsignado && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">Contactar a {usuarioAsignado.getNombreCompleto()}</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendChat();
                  }}
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatMessage.trim()}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Chatear
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Ventana>
  );
}
