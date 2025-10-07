"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/infrastructure/services/SupabaseClient";
import { useAuth } from "@/app/contexts/AuthContext";

export default function RealtimeTest() {
  const { usuario } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<string>("Iniciando...");
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev.slice(-3), `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Test de conexión realtime
  useEffect(() => {
    if (!usuario?.idOrganizacion) return;

    addLog('🚀 Iniciando test de conexión realtime...');
    setConnectionStatus('Conectando...');

    // Test básico de conexión
    const testChannel = supabase
      .channel('connection-test')
      .subscribe((status) => {
        addLog(`📡 Estado conexión: ${status}`);
        setConnectionStatus(status);
      });

    // Test de suscripción a tabla sala
    const salaChannel = supabase
      .channel(`sala-test-${usuario.idOrganizacion}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sala'
        },
        (payload) => {
          addLog(`✅ Cambio detectado: ${payload.eventType} en sala`);
        }
      )
      .subscribe((status) => {
        addLog(`🏠 Suscripción sala: ${status}`);
      });

    return () => {
      addLog('🔒 Cerrando canales de test');
      supabase.removeChannel(testChannel);
      supabase.removeChannel(salaChannel);
    };
  }, [usuario?.idOrganizacion]);

  const createTestSala = async () => {
    if (!usuario?.idOrganizacion) {
      setMessage("❌ No hay organización");
      return;
    }

    setIsCreating(true);
    setMessage("");

    try {
      // Crear una nueva sala
      const { data: newSala, error: salaError } = await supabase
        .from('sala')
        .insert({
          nombre: `Sala Test ${Date.now()}`,
          descripcion: 'Sala creada para probar realtime',
          id_organizacion: usuario.idOrganizacion
        })
        .select()
        .single();

      if (salaError) {
        setMessage(`❌ Error creando sala: ${salaError.message}`);
        return;
      }

      console.log('✅ Sala creada:', newSala);

      // Obtener los id_salas actuales de la organización
      const { data: orgData, error: orgError } = await supabase
        .from('organizacion')
        .select('id_salas')
        .eq('id', usuario.idOrganizacion)
        .single();

      if (orgError) {
        setMessage(`❌ Error obteniendo organización: ${orgError.message}`);
        return;
      }

      // Agregar el nuevo ID a la lista
      const currentIds = orgData.id_salas || [];
      const newIds = [...currentIds, String(newSala.id)];

      // Actualizar la organización con el nuevo ID de sala
      const { error: updateError } = await supabase
        .from('organizacion')
        .update({ id_salas: newIds })
        .eq('id', usuario.idOrganizacion);

      if (updateError) {
        setMessage(`❌ Error actualizando organización: ${updateError.message}`);
        return;
      }

      setMessage(`✅ Sala creada y agregada a organización: ${newSala.nombre}`);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsCreating(false);
    }
  };

  const updateRandomSala = async () => {
    if (!usuario?.idOrganizacion) {
      setMessage("❌ No hay organización");
      return;
    }

    setIsUpdating(true);
    setMessage("");

    try {
      // Obtener una sala aleatoria de la organización
      const { data: salas, error: salasError } = await supabase
        .from('sala')
        .select('id, nombre')
        .eq('id_organizacion', usuario.idOrganizacion)
        .limit(5);

      if (salasError || !salas || salas.length === 0) {
        setMessage("❌ No hay salas para actualizar");
        return;
      }

      const randomSala = salas[Math.floor(Math.random() * salas.length)];

      // Actualizar la sala
      const { error: updateError } = await supabase
        .from('sala')
        .update({
          descripcion: `Actualizada el ${new Date().toLocaleString()}`
        })
        .eq('id', randomSala.id);

      if (updateError) {
        setMessage(`❌ Error actualizando sala: ${updateError.message}`);
        return;
      }

      setMessage(`✅ Sala actualizada: ${randomSala.nombre}`);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!usuario?.idOrganizacion) {
    return (
      <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
        <h3 className="font-bold text-red-600 mb-2">Realtime Test</h3>
        <p className="text-sm text-gray-600">No hay organización para probar</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg max-w-sm">
      <h3 className="font-bold mb-3">🧪 Realtime Test</h3>
      
      {/* Estado de conexión */}
      <div className="mb-3 p-2 bg-gray-100 rounded text-xs">
        <div className="flex justify-between">
          <span>Estado:</span>
          <span className={connectionStatus === 'SUBSCRIBED' ? 'text-green-600 font-bold' : 'text-red-600'}>{connectionStatus}</span>
        </div>
      </div>

      {/* Logs recientes */}
      <div className="mb-3 max-h-16 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
        {logs.map((log, i) => (
          <div key={i} className="text-gray-700">{log}</div>
        ))}
        {logs.length === 0 && <div className="text-gray-400">No hay logs aún...</div>}
      </div>
      
      <div className="space-y-2 mb-3">
        <button
          onClick={createTestSala}
          disabled={isCreating}
          className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
        >
          {isCreating ? 'Creando...' : '➕ Crear Sala Test'}
        </button>
        
        <button
          onClick={updateRandomSala}
          disabled={isUpdating}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isUpdating ? 'Actualizando...' : '✏️ Actualizar Sala'}
        </button>
      </div>

      {message && (
        <div className="text-xs p-2 bg-gray-100 rounded border">
          {message}
        </div>
      )}
      
      <div className="text-xs text-gray-500 mt-2">
        Org: {usuario.idOrganizacion.slice(0, 8)}...
      </div>
    </div>
  );
}