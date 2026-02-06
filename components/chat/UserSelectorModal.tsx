'use client';

import React from 'react';

export interface UserOption {
  userAuth: string;
  nombre: string;
  avatar?: string;
  color?: string;
}

interface UserSelectorModalProps {
  usuarios: UserOption[];
  onSelect: (user: UserOption) => void;
  onClose: () => void;
}

export const UserSelectorModal: React.FC<UserSelectorModalProps> = ({ usuarios, onSelect, onClose }) => {
  if (usuarios.length === 0) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Compartir card</h3>
          <p className="text-sm text-gray-500">No hay usuarios disponibles para compartir.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Compartir card con...</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {usuarios.map((user) => (
            <button
              key={user.userAuth}
              onClick={() => onSelect(user)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left border border-transparent hover:border-blue-200"
            >
              <div className={`w-10 h-10 rounded-full ${user.color || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-sm shadow-sm overflow-hidden`}>
                {user.avatar && (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) ? (
                  <img src={user.avatar} alt={user.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span>{user.avatar || user.nombre.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <span className="text-sm font-medium text-gray-800">{user.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
