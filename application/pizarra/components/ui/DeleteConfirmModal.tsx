import React from 'react';

interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div
      className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg"
      data-config-button="true"
    >
      <div className="bg-white p-4 rounded-lg shadow-xl max-w-xs">
        <h3 className="text-gray-800 font-semibold mb-2">¿Eliminar card?</h3>
        <p className="text-gray-600 text-sm mb-4">Esta acción no se puede deshacer.</p>
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-2 rounded text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};
