'use client';

import React from 'react';
import { useChatWindows } from '@/app/contexts/ChatWindowContext';
import { ChatWindow } from './ChatWindow';

export const ChatWindowManager: React.FC = () => {
  const { chatWindows } = useChatWindows();

  return (
    <>
      {chatWindows.map((window) => (
        <ChatWindow
          key={window.id}
          windowId={window.id}
          userId={window.userId}
          userName={window.userName}
          userAvatar={window.userAvatar}
          userColor={window.userColor}
          isOnline={window.isOnline}
          position={window.position || { x: 100, y: 100 }}
          isMinimized={window.isMinimized || false}
        />
      ))}
    </>
  );
};
