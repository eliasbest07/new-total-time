"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useSalas } from "@/hooks/useSalas";

export default function SalasDebug() {
  const { usuario } = useAuth();
  const { salas, loading, error, salaActiva } = useSalas(usuario?.idOrganizacion || null);

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md max-h-96 overflow-y-auto">
      <h3 className="font-bold mb-2">Debug Salas (Realtime)</h3>

      <div className="mb-2">
        <strong>Salas Loading:</strong> {loading ? 'Sí' : 'No'}
      </div>

      {usuario ? (
        <>
          <div className="mb-2">
            <strong>Usuario:</strong> {usuario.profile.nombre}
          </div>

          <div className="mb-2">
            <strong>ID Organización:</strong> {usuario.idOrganizacion || 'No tiene'}
          </div>

          <div className="mb-2">
            <strong>Salas encontradas:</strong> {salas.length}
          </div>

          {error && (
            <div className="mb-2 text-red-600">
              <strong>Error:</strong> {error}
            </div>
          )}

          {salaActiva && (
            <div className="mb-2 text-green-600">
              <strong>Sala activa:</strong> {salaActiva.nombre}
            </div>
          )}

          <div className="mb-2">
            <strong>Lista de salas:</strong>
            <ul className="text-xs ml-2">
              {salas.map(sala => (
                <li key={sala.id} className={sala.activa ? 'font-bold' : ''}>
                  {sala.id}: {sala.nombre} {sala.activa ? '(activa)' : ''}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div className="mb-2 text-red-600">
          <strong>Estado:</strong> No hay usuario logueado
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Hook useSalas activo - Datos en tiempo real
      </div>
    </div>
  );
}