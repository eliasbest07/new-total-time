"use client";

import { useSalas } from "@/hooks/useSalas";
import { useAuth } from "@/app/contexts/AuthContext";

export default function SalasDebug() {
  const { usuario } = useAuth();
  const { salas, isLoading, error, cargarSalas } = useSalas();

  if (!usuario) {
    return (
      <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md">
        <h3 className="font-bold text-red-600">Debug Salas</h3>
        <p>No hay usuario logueado</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 z-30 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-y-auto">
      <h3 className="font-bold text-black mb-2">Debug Salas</h3>
      
      <div className="mb-2">
        <strong>Usuario:</strong> {usuario.profile.nombre}
      </div>
      
      <div className="mb-2">
        <strong>ID Organización:</strong> {usuario.idOrganizacion || 'No tiene'}
      </div>
      
      <div className="mb-2">
        <strong>Estado:</strong> {isLoading ? 'Cargando...' : 'Listo'}
      </div>
      
      {error && (
        <div className="mb-2 text-red-600">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      <div className="mb-2">
        <strong>Salas ({salas.length}):</strong>
        {salas.length === 0 ? (
          <p className="text-gray-500">No hay salas</p>
        ) : (
          <ul className="list-disc list-inside">
            {salas.map(sala => (
              <li key={sala.id} className={sala.activa ? 'font-bold text-green-600' : ''}>
                {sala.nombre || 'Sin nombre'} (ID: {sala.id})
                {sala.activa && ' ← Activa'}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <button 
        onClick={cargarSalas}
        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
        disabled={isLoading}
      >
        Recargar Salas
      </button>
    </div>
  );
}