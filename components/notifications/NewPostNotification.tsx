'use client';

import React, { useEffect, useState } from 'react';
import { X, MessageSquare } from 'lucide-react';

interface NewPostNotificationProps {
  autorNombre: string;
  contenido: string;
  onClose: () => void;
  onView: () => void;
}

export const NewPostNotification: React.FC<NewPostNotificationProps> = ({
  autorNombre,
  contenido,
  onClose,
  onView
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setIsVisible(true), 10);

    // Auto-cerrar después de 5 segundos
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleView = () => {
    onView();
    handleClose();
  };

  return (
    <div
      className={`fixed top-20 right-6 z-50 transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-xl shadow-2xl p-4 max-w-md min-w-[320px] border border-purple-400/30">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Nuevo Post</h3>
              <p className="text-xs text-purple-200">{autorNombre}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-purple-200 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido del post */}
        <div className="bg-white/10 rounded-lg p-3 mb-3 backdrop-blur-sm">
          <p className="text-sm text-purple-50 line-clamp-2">
            {contenido}
          </p>
        </div>

        {/* Botón de acción */}
        <button
          onClick={handleView}
          className="w-full bg-white text-purple-700 hover:bg-purple-50 font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-md"
        >
          Ver Post
        </button>
      </div>
    </div>
  );
};
