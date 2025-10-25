'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface NewPostsBadgeProps {
  count: number;
  onClick: () => void;
}

export const NewPostsBadge: React.FC<NewPostsBadgeProps> = ({ count, onClick }) => {
  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-6 z-40 bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-full shadow-2xl p-4 hover:scale-110 transition-transform duration-200 border-2 border-white/30 group"
      title={`${count} post${count > 1 ? 's' : ''} no visto${count > 1 ? 's' : ''}`}
    >
      <div className="relative">
        <MessageSquare className="w-6 h-6" />

        {/* Badge de contador */}
        <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white animate-pulse">
          {count > 9 ? '9+' : count}
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-1 px-3 whitespace-nowrap">
          {count} post{count > 1 ? 's' : ''} no visto{count > 1 ? 's' : ''}
        </div>
      </div>
    </button>
  );
};
