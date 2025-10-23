/**
 * Utilidad para monitorear el rendimiento y uso de memoria
 */

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedMB: number;
  totalMB: number;
  limitMB: number;
  percentage: number;
}

/**
 * Obtiene información sobre el uso de memoria actual
 */
export const getMemoryInfo = (): MemoryInfo | null => {
  if (typeof window === 'undefined') return null;

  // @ts-ignore - performance.memory no está en todos los navegadores
  const memory = (performance as any).memory;

  if (!memory) {
    console.warn('⚠️ performance.memory no está disponible en este navegador');
    return null;
  }

  const usedMB = memory.usedJSHeapSize / 1048576;
  const totalMB = memory.totalJSHeapSize / 1048576;
  const limitMB = memory.jsHeapSizeLimit / 1048576;
  const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    usedMB: Math.round(usedMB * 100) / 100,
    totalMB: Math.round(totalMB * 100) / 100,
    limitMB: Math.round(limitMB * 100) / 100,
    percentage: Math.round(percentage * 100) / 100
  };
};

/**
 * Imprime información de memoria en consola
 */
export const logMemoryInfo = (label: string = 'Memory Info') => {
  const info = getMemoryInfo();
  if (!info) return;

  console.group(`🧠 ${label}`);
  console.log(`Usado: ${info.usedMB} MB`);
  console.log(`Total: ${info.totalMB} MB`);
  console.log(`Límite: ${info.limitMB} MB`);
  console.log(`Porcentaje: ${info.percentage}%`);

  if (info.percentage > 90) {
    console.warn('⚠️ USO DE MEMORIA CRÍTICO (>90%)');
  } else if (info.percentage > 70) {
    console.warn('⚠️ Uso de memoria alto (>70%)');
  }

  console.groupEnd();
};

/**
 * Monitorea el uso de memoria en intervalos
 */
export const startMemoryMonitoring = (intervalMs: number = 5000) => {
  const intervalId = setInterval(() => {
    logMemoryInfo('Monitor de Memoria');
  }, intervalMs);

  console.log(`✅ Monitor de memoria iniciado (cada ${intervalMs}ms)`);
  console.log('Para detenerlo, ejecuta: clearInterval(window.__memoryMonitorId)');

  // @ts-ignore
  window.__memoryMonitorId = intervalId;

  return intervalId;
};

/**
 * Detiene el monitoreo de memoria
 */
export const stopMemoryMonitoring = () => {
  // @ts-ignore
  if (window.__memoryMonitorId) {
    // @ts-ignore
    clearInterval(window.__memoryMonitorId);
    // @ts-ignore
    window.__memoryMonitorId = null;
    console.log('✅ Monitor de memoria detenido');
  }
};

/**
 * Hook de React para monitorear memoria de un componente
 */
export const useMemoryMonitor = (componentName: string, enabled: boolean = true) => {
  if (typeof window === 'undefined' || !enabled) return;

  // Log al montar
  console.log(`📊 ${componentName} - Montado`);
  logMemoryInfo(`${componentName} - Memoria al montar`);

  // Cleanup al desmontar
  return () => {
    console.log(`📊 ${componentName} - Desmontado`);
    logMemoryInfo(`${componentName} - Memoria al desmontar`);
  };
};

/**
 * Cuenta elementos en el DOM
 */
export const countDOMNodes = (): number => {
  if (typeof document === 'undefined') return 0;
  return document.getElementsByTagName('*').length;
};

/**
 * Análisis completo de rendimiento
 */
export const analyzePerformance = () => {
  console.group('🔍 Análisis de Rendimiento');

  // Memoria
  logMemoryInfo('Uso de Memoria');

  // Nodos DOM
  const nodeCount = countDOMNodes();
  console.log(`📄 Nodos en DOM: ${nodeCount}`);
  if (nodeCount > 5000) {
    console.warn('⚠️ Número alto de nodos DOM (puede causar lentitud)');
  }

  // Event Listeners (aproximado)
  // @ts-ignore
  const listeners = window.getEventListeners ? Object.keys(window.getEventListeners(document)).length : 'N/A';
  console.log(`🎯 Event Listeners: ${listeners}`);

  // Performance Navigation Timing
  if (performance && performance.getEntriesByType) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      console.group('⏱️ Tiempos de Carga');
      console.log(`DOM Content Loaded: ${Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart)}ms`);
      console.log(`Load Complete: ${Math.round(navigation.loadEventEnd - navigation.loadEventStart)}ms`);
      console.log(`DOM Interactive: ${Math.round(navigation.domInteractive - navigation.fetchStart)}ms`);
      console.groupEnd();
    }
  }

  console.groupEnd();
};

// Exponer utilidades globalmente para debugging
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__performanceUtils = {
    getMemoryInfo,
    logMemoryInfo,
    startMemoryMonitoring,
    stopMemoryMonitoring,
    analyzePerformance,
    countDOMNodes
  };

  console.log('💡 Utilidades de rendimiento disponibles en window.__performanceUtils');
}
