"use client";

import { useState, useEffect } from 'react';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';
import { Clock, Calendar } from 'lucide-react';

interface CalendarioSemanalUsuarioProps {
  userId: string;
  userName: string;
}

interface CapturesPorDia {
  [key: string]: Capture[];
}

const MINUTOS_POR_CAPTURA = 5;

// Colores pasteles para los bloques de cada día
const coloresPasteles = [
  'bg-pink-100/80 border-pink-200/60 text-pink-800',
  'bg-purple-100/80 border-purple-200/60 text-purple-800',
  'bg-blue-100/80 border-blue-200/60 text-blue-800',
  'bg-cyan-100/80 border-cyan-200/60 text-cyan-800',
  'bg-teal-100/80 border-teal-200/60 text-teal-800',
  'bg-green-100/80 border-green-200/60 text-green-800',
  'bg-yellow-100/80 border-yellow-200/60 text-yellow-800',
];

export default function CalendarioSemanalUsuario({ userId, userName }: CalendarioSemanalUsuarioProps) {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [capturesPorDia, setCapturesPorDia] = useState<CapturesPorDia>({});
  const [totalHorasSemana, setTotalHorasSemana] = useState('0h 0m');

  // Obtener los días de la semana actual (lunes a domingo)
  const obtenerDiasSemana = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const diasHastaLunes = diaSemana === 0 ? 6 : diaSemana - 1;

    const dias = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(hoy);
      dia.setDate(hoy.getDate() - diasHastaLunes + i);
      dias.push(dia);
    }
    return dias;
  };

  const diasSemana = obtenerDiasSemana();

  // Formatear fecha a string "YYYY-MM-DD"
  const formatearFecha = (fecha: Date): string => {
    return fecha.toISOString().split('T')[0];
  };

  // Formatear hora a "HH:MM"
  const formatearHora = (fecha: Date): string => {
    return new Date(fecha).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Formatear minutos a "Xh Ym"
  const formatearTiempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  };

  // Cargar capturas del usuario
  useEffect(() => {
    const loadCaptures = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const captureRepo = new CaptureRepositorySupabase();

        // Obtener todas las capturas del usuario
        const allCaptures = await captureRepo.getByUsuario(userId);

        // Filtrar solo las capturas de esta semana
        const inicioSemana = diasSemana[0];
        inicioSemana.setHours(0, 0, 0, 0);

        const finSemana = new Date(diasSemana[6]);
        finSemana.setHours(23, 59, 59, 999);

        const capturesSemana = allCaptures.filter(capture => {
          const fechaCapture = new Date(capture.created_at);
          return fechaCapture >= inicioSemana && fechaCapture <= finSemana;
        });

        setCaptures(capturesSemana);

        // Agrupar por día
        const agrupadas: CapturesPorDia = {};
        capturesSemana.forEach(capture => {
          const fechaKey = formatearFecha(new Date(capture.created_at));
          if (!agrupadas[fechaKey]) {
            agrupadas[fechaKey] = [];
          }
          agrupadas[fechaKey].push(capture);
        });

        // Ordenar capturas de cada día por hora
        Object.keys(agrupadas).forEach(key => {
          agrupadas[key].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });

        setCapturesPorDia(agrupadas);

        // Calcular total de horas de la semana
        const totalMinutos = capturesSemana.length * MINUTOS_POR_CAPTURA;
        setTotalHorasSemana(formatearTiempo(totalMinutos));

      } catch (error) {
        console.error('Error al cargar captures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCaptures();
  }, [userId]);

  // Obtener nombre del día en español
  const obtenerNombreDia = (fecha: Date): string => {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[fecha.getDay()];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con información del usuario y total de horas */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{userName}</h3>
              <p className="text-sm text-gray-600">Semana del {diasSemana[0].toLocaleDateString('es-ES')} al {diasSemana[6].toLocaleDateString('es-ES')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-200/50">
            <Clock className="w-5 h-5 text-purple-600" />
            <div className="text-right">
              <p className="text-xs text-gray-600">Total Semana</p>
              <p className="text-lg font-bold text-purple-700">{totalHorasSemana}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendario semanal */}
      <div className="grid grid-cols-7 gap-3">
        {diasSemana.map((dia, index) => {
          const fechaKey = formatearFecha(dia);
          const capturasDia = capturesPorDia[fechaKey] || [];
          const totalMinutosDia = capturasDia.length * MINUTOS_POR_CAPTURA;
          const colorDia = coloresPasteles[index];
          const esHoy = formatearFecha(new Date()) === fechaKey;

          return (
            <div
              key={fechaKey}
              className={`flex flex-col ${esHoy ? 'ring-2 ring-purple-400' : ''} rounded-xl overflow-hidden`}
            >
              {/* Header del día */}
              <div className={`${colorDia} p-3 text-center border-b backdrop-blur-sm`}>
                <p className="text-sm font-bold">{obtenerNombreDia(dia)}</p>
                <p className="text-xs opacity-80">{dia.getDate()}</p>
                {capturasDia.length > 0 && (
                  <p className="text-xs font-semibold mt-1">
                    {formatearTiempo(totalMinutosDia)}
                  </p>
                )}
              </div>

              {/* Bloques de capturas */}
              <div className="bg-white/40 backdrop-blur-sm p-2 space-y-2 min-h-[400px] max-h-[500px] overflow-y-auto border border-gray-100/50">
                {capturasDia.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-gray-400 text-center">Sin registros</p>
                  </div>
                ) : (
                  capturasDia.map((capture, idx) => (
                    <div
                      key={capture.id}
                      className={`${colorDia} rounded-lg p-2 border backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow cursor-pointer group`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">
                          {formatearHora(capture.created_at)}
                        </span>
                        <span className="text-xs opacity-75">
                          {MINUTOS_POR_CAPTURA}m
                        </span>
                      </div>
                      <p className="text-xs font-medium line-clamp-2 opacity-90">
                        {capture.mision_actividad || 'Sin título'}
                      </p>
                      {capture.img_url && (
                        <div className="mt-2 rounded overflow-hidden border border-white/50 group-hover:scale-105 transition-transform">
                          <img
                            src={capture.img_url}
                            alt="Captura"
                            className="w-full h-16 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen de la semana */}
      {captures.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100/50 backdrop-blur-sm">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">{captures.length}</p>
              <p className="text-xs text-gray-600">Capturas Totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{totalHorasSemana}</p>
              <p className="text-xs text-gray-600">Tiempo Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {Object.keys(capturesPorDia).length}
              </p>
              <p className="text-xs text-gray-600">Días Activos</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
