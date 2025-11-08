"use client";

import { useState, useEffect } from 'react';
import { SupabaseTimeTrackingRepository, TimeInterval } from '@/infrastructure/datasource/SupabaseTimeTrackingRepository';
import { Clock, Calendar } from 'lucide-react';

interface IntervalosTiempoProps {
  userId: string;
}

export default function IntervalosTiempo({ userId }: IntervalosTiempoProps) {
  const [intervalos, setIntervalos] = useState<TimeInterval[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(() => {
    // Fecha de hoy por defecto
    return new Date().toISOString().split('T')[0];
  });
  const [cargando, setCargando] = useState(true);
  const [totalTiempo, setTotalTiempo] = useState(0);

  const repository = new SupabaseTimeTrackingRepository();

  // Cargar intervalos cuando cambia la fecha o el usuario
  useEffect(() => {
    const cargarIntervalos = async () => {
      setCargando(true);
      try {
        const data = await repository.getIntervalsByUserAndDate(userId, fechaSeleccionada);
        setIntervalos(data);

        // Calcular tiempo total
        const total = data.reduce((sum, interval) => sum + (interval.duracion || 0), 0);
        setTotalTiempo(total);
      } catch (error) {
        console.error('Error cargando intervalos:', error);
      } finally {
        setCargando(false);
      }
    };

    if (userId && fechaSeleccionada) {
      cargarIntervalos();
    }
  }, [userId, fechaSeleccionada]);

  // Formatear hora de "HH:MM:SS" a "HH:MM"
  const formatearHora = (hora: string): string => {
    if (!hora) return '--:--';

    // Si es un timestamp completo, extraer la hora
    if (hora.includes('T')) {
      const date = new Date(hora);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }

    // Si es formato "HH:MM:SS"
    return hora.split(':').slice(0, 2).join(':');
  };

  // Formatear duración en minutos a "HH:MM"
  const formatearDuracion = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  // Formatear tiempo total
  const tiempoTotalFormateado = formatearDuracion(totalTiempo);

  return (
    <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6">
      {/* Header con título y selector de fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-white" />
          <h3 className="text-white text-lg sm:text-xl font-medium">
            Intervalos de Tiempo
          </h3>
        </div>

        {/* Selector de fecha */}
        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
          <Calendar className="w-4 h-4 text-white" />
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="bg-transparent text-white text-sm outline-none cursor-pointer"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Tiempo total del día */}
      <div className="bg-white/10 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-white/70 text-sm">Tiempo total:</span>
          <span className="text-white text-lg font-bold">{tiempoTotalFormateado}</span>
        </div>
      </div>

      {/* Lista de intervalos */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {cargando ? (
          <div className="text-center text-white/70 py-8">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Cargando intervalos...</p>
          </div>
        ) : intervalos.length === 0 ? (
          <div className="text-center text-white/70 py-8">
            <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay intervalos registrados para esta fecha</p>
          </div>
        ) : (
          intervalos.map((intervalo) => (
            <div
              key={intervalo.id}
              className="bg-white/10 rounded-lg p-4 hover:bg-white/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                {/* Horario */}
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/20 rounded-full p-2">
                    <Clock className="w-4 h-4 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {formatearHora(intervalo.hora_inicio)} - {formatearHora(intervalo.hora_fin)}
                    </p>
                    <p className="text-white/60 text-xs">
                      Duración: {formatearDuracion(intervalo.duracion || 0)}
                    </p>
                  </div>
                </div>

                {/* Badge de duración */}
                <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                  {formatearDuracion(intervalo.duracion || 0)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Scrollbar personalizado */}
      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
