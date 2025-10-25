'use client';

import React from 'react';

interface UnviewedPostsBadgeProps {
  count: number;
  compact?: boolean; // Para mostrar versión más compacta en las tarjetas
}

/**
 * Badge discreto que muestra el número de posts no vistos
 * Diseñado para mostrarse arriba del título de la sala
 */
export const UnviewedPostsBadge: React.FC<UnviewedPostsBadgeProps> = ({
  count,
  compact = false
}) => {
  if (count === 0) return null;

  if (compact) {
    // Versión compacta: solo un pequeño círculo con número
    return (
      <div
        className="inline-flex items-center justify-center bg-red-500 text-white rounded-full min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold shadow-sm"
        title={`${count} post${count > 1 ? 's' : ''} no visto${count > 1 ? 's' : ''}`}
      >
        {count > 99 ? '99+' : count}
      </div>
    );
  }

  // Versión normal: con texto
  return (
    <div
      className="inline-flex items-center gap-1 bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm"
      title={`${count} post${count > 1 ? 's' : ''} no visto${count > 1 ? 's' : ''}`}
    >
      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
      <span>{count > 99 ? '99+' : count}</span>
    </div>
  );
};
