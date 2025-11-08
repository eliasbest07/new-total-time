'use client';

import { MemoryMonitor } from "@/components/debug/MemoryMonitor";
import { useSettings } from '../contexts/SettingsContext';

export const MemoryMonitorWrapper = () => {
  const { showMemoryMonitor } = useSettings();

  // Solo mostrar en desarrollo Y si la configuración está activada
  if (process.env.NODE_ENV !== 'development' || !showMemoryMonitor) {
    return null;
  }

  return <MemoryMonitor />;
};
