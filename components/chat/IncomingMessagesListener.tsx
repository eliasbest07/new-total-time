'use client';

import React from 'react';
import { useIncomingMessages } from '@/hooks/useIncomingMessages';

/**
 * Componente que escucha mensajes entrantes y abre ventanas de chat automáticamente
 * Este componente no renderiza nada, solo ejecuta el hook
 */
export const IncomingMessagesListener: React.FC = () => {
  useIncomingMessages();
  return null;
};
