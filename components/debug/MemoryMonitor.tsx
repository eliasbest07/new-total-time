'use client';

import { useEffect, useState } from 'react';
import { getMemoryInfo } from '@/utils/performanceMonitor';

interface MemoryStats {
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentage: number;
}

export const MemoryMonitor = () => {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    const updateStats = () => {
      const info = getMemoryInfo();
      if (info) {
        setStats({
          usedMB: info.usedMB,
          totalMB: info.totalMB,
          limitMB: info.limitMB,
          percentage: info.percentage
        });

        // Mantener historial de los últimos 20 valores
        setHistory(prev => [...prev.slice(-19), info.percentage]);
      }
    };

    // Actualizar cada 2 segundos
    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50">
        <p className="text-sm">Memory API no disponible</p>
      </div>
    );
  }

  const getColor = () => {
    if (stats.percentage > 90) return 'bg-red-500';
    if (stats.percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = () => {
    if (stats.percentage > 90) return 'text-red-500';
    if (stats.percentage > 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-lg z-50 min-w-[300px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">🧠 Monitor de Memoria</h3>
        <span className={`text-xs font-mono ${getTextColor()}`}>
          {stats.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getColor()}`}
          style={{ width: `${Math.min(stats.percentage, 100)}%` }}
        />
      </div>

      {/* Estadísticas */}
      <div className="space-y-1 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-gray-400">Usado:</span>
          <span>{stats.usedMB.toFixed(2)} MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Total:</span>
          <span>{stats.totalMB.toFixed(2)} MB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Límite:</span>
          <span>{stats.limitMB.toFixed(2)} MB</span>
        </div>
      </div>

      {/* Mini gráfico de historial */}
      <div className="mt-3 flex items-end gap-0.5 h-12">
        {history.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-blue-500 rounded-t"
            style={{
              height: `${value}%`,
              opacity: 0.3 + (index / history.length) * 0.7
            }}
          />
        ))}
      </div>

      {/* Advertencias */}
      {stats.percentage > 90 && (
        <div className="mt-2 text-xs bg-red-500/20 border border-red-500 rounded p-2">
          ⚠️ Memoria crítica. Considera recargar la página.
        </div>
      )}
    </div>
  );
};
