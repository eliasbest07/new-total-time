import React, { useState } from 'react';
import { Card } from '../../types';
import { User, ExternalLink, Calendar, Clock } from 'lucide-react';

interface ActividadCardOrganizacionProps {
  card: Card;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  usuarios?: Array<{
    id: number;
    userAuth?: string;
    profile: {
      nombre: string;
      apellido: string;
      avatar?: string;
    };
  }>;
  currentUserId?: string;
}

export const ActividadCardOrganizacion: React.FC<ActividadCardOrganizacionProps> = ({
  card,
  updateCard,
  usuarios = [],
  currentUserId
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);

  // Obtener datos de la actividad
  const actividadData = card.actividadData || {
    id_actividad: '',
    descripcion: card.title,
    fecha: null,
    hora_inicio: null,
    cant_horas: null,
    link: null,
    id_usuario: '',
    id_proyecto: null,
    tiempo_dedicado: null
  };

  // Buscar usuario asignado
  const usuarioAsignado = usuarios.find(u => u.userAuth === actividadData.id_usuario);

  // Formatear fecha
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Formatear hora
  const formatTime = (timeString: string | null) => {
    if (!timeString) return null;
    const date = new Date(timeString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Manejar cambio de descripción
  const handleDescriptionChange = (newDescription: string) => {
    updateCard(card.id, {
      title: newDescription,
      actividadData: {
        ...actividadData,
        descripcion: newDescription
      }
    });
    setIsEditingDescription(false);
  };

  // Manejar asignación de usuario
  const handleAsignarUsuario = (usuario: any) => {
    updateCard(card.id, {
      actividadData: {
        ...actividadData,
        id_usuario: usuario.userAuth
      }
    });
    setShowUsuarioSelector(false);
  };

  return (
    <div className="flex flex-col h-full w-full p-3 bg-white rounded-lg">
      {/* Header con emoji y horas */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
        <div className="text-2xl">📅</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-800 text-sm">
            Actividad
          </h3>
        </div>
        {actividadData.cant_horas && actividadData.cant_horas > 0 && (
          <div className="bg-orange-500 text-white rounded-full px-2 py-1 text-xs font-semibold">
            {actividadData.cant_horas}h
          </div>
        )}
      </div>

      {/* Descripción editable */}
      <div className="mb-2">
        {isEditingDescription ? (
          <textarea
            defaultValue={actividadData.descripcion}
            onBlur={(e) => handleDescriptionChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsEditingDescription(false);
              }
            }}
            className="w-full text-xs text-gray-600 bg-transparent border border-orange-400 rounded px-2 py-1 focus:outline-none resize-none"
            rows={3}
            autoFocus
            data-todo-interactive
          />
        ) : (
          <p
            className="text-xs text-gray-600 cursor-pointer hover:text-orange-600 line-clamp-3"
            onClick={() => setIsEditingDescription(true)}
            data-todo-interactive
          >
            {actividadData.descripcion || 'Click para agregar descripción...'}
          </p>
        )}
      </div>

      {/* Usuario asignado */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1">
          {usuarioAsignado ? (
            <div
              className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1 cursor-pointer hover:bg-gray-200"
              onClick={() => setShowUsuarioSelector(!showUsuarioSelector)}
              data-todo-interactive
            >
              {usuarioAsignado.profile.avatar ? (
                <img
                  src={usuarioAsignado.profile.avatar}
                  alt={`${usuarioAsignado.profile.nombre} ${usuarioAsignado.profile.apellido}`}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                  {usuarioAsignado.profile.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700 truncate">
                {usuarioAsignado.profile.nombre} {usuarioAsignado.profile.apellido}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowUsuarioSelector(!showUsuarioSelector)}
              className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700"
              data-todo-interactive
            >
              <User size={14} />
              <span>Asignar usuario</span>
            </button>
          )}

          {/* Selector de usuarios */}
          {showUsuarioSelector && (
            <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto" data-todo-interactive>
              {usuarios.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">No hay usuarios disponibles</div>
              ) : (
                usuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    onClick={() => handleAsignarUsuario(usuario)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {usuario.profile.avatar ? (
                      <img
                        src={usuario.profile.avatar}
                        alt={`${usuario.profile.nombre} ${usuario.profile.apellido}`}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs">
                        {usuario.profile.nombre.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-700">
                      {usuario.profile.nombre} {usuario.profile.apellido}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Información de fecha/hora */}
      <div className="space-y-1 mb-3">
        {actividadData.fecha && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar size={12} className="text-orange-500" />
            <span>{formatDate(actividadData.fecha)}</span>
          </div>
        )}
        {actividadData.hora_inicio && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock size={12} className="text-orange-500" />
            <span>{formatTime(actividadData.hora_inicio)}</span>
          </div>
        )}
      </div>

      {/* Link si existe */}
      {actividadData.link && (
        <div className="mb-3">
          <a
            href={actividadData.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            <ExternalLink size={12} />
            <span className="truncate">Ver enlace</span>
          </a>
        </div>
      )}

      {/* Tiempo dedicado si existe */}
      {actividadData.tiempo_dedicado && actividadData.tiempo_dedicado > 0 && (
        <div className="mt-auto pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Tiempo dedicado:</span>
            <span className="font-semibold text-green-600">{actividadData.tiempo_dedicado} min</span>
          </div>
        </div>
      )}

      {/* Footer - ID de actividad */}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-[10px] text-gray-400 truncate">
          ID: {actividadData.id_actividad}
        </p>
      </div>
    </div>
  );
};
