import { useState, useEffect, useRef, useCallback } from 'react';

interface Screenshot {
  id: string;
  timestamp: number;
  fileName: string;
  filePath: string;
  actividadId: number;
}

interface UseScreenshotsReturn {
  screenshots: Screenshot[];
  isCapturing: boolean;
  startCapturing: (actividadId: number) => Promise<void>;
  stopCapturing: () => void;
  clearScreenshots: () => void;
  clearScreenshotsByActivity: (actividadId: number) => void;
  reloadScreenshots: () => void;
  error: string | null;
}

export const useScreenshots = (): UseScreenshotsReturn => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentActividadIdRef = useRef<number | null>(null);

  // Función para descargar un blob como archivo
  const downloadFile = useCallback(async (blob: Blob, fileName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        // Crear un enlace temporal para descargar
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpiar la URL del objeto después de un breve delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        // Para el propósito de la UI, devolvemos la URL del blob como path temporal
        resolve(url);
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Función para capturar un frame del video
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !currentActividadIdRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);
      
      // Convertir canvas a blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const timestamp = Date.now();
        const fileName = `screenshot_actividad_${currentActividadIdRef.current}_${timestamp}.png`;
        
        try {
          // Guardar archivo en el sistema
          const filePath = await downloadFile(blob, fileName);
          
          const newScreenshot: Screenshot = {
            id: `screenshot-${timestamp}-${Math.random()}`,
            timestamp,
            fileName,
            filePath, // URL temporal del blob para mostrar en la UI
            actividadId: currentActividadIdRef.current!
          };

          setScreenshots(prev => [...prev, newScreenshot]);
          
        } catch (err) {
          console.error('Error al guardar archivo:', err);
          setError('Error al guardar captura de pantalla');
        }
      }, 'image/png', 0.9); // Calidad del 90%

    } catch (err) {
      console.error('Error al capturar frame:', err);
      setError('Error al capturar pantalla');
    }
  }, [downloadFile]);

  // Iniciar captura de pantalla
  const startCapturing = useCallback(async (actividadId: number) => {
    try {
      setError(null);
      currentActividadIdRef.current = actividadId;

      // Verificar si la API está disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        setError('Tu navegador no soporta captura de pantalla');
        return;
      }

      console.log('Solicitando permiso de captura de pantalla...');

      // Solicitar permiso para capturar pantalla
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // 'monitor', 'window', o 'browser'
        },
        audio: false
      });

      console.log('Permiso concedido, stream obtenido');

      mediaStreamRef.current = stream;

      // Crear elemento de video para procesar el stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      videoRef.current = video;

      // Esperar a que el video esté listo
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play();
          resolve();
        };
      });

      setIsCapturing(true);

      // Tomar primera captura inmediatamente
      setTimeout(() => captureFrame(), 500);

      // Configurar intervalo para capturas cada 5 segundos
      intervalRef.current = setInterval(() => {
        captureFrame();
      }, 5000);

      // Detectar cuando el usuario detiene la compartición de pantalla
      stream.getVideoTracks()[0].onended = () => {
        stopCapturing();
      };

    } catch (err) {
      console.error('Error al iniciar captura:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Permiso denegado para capturar pantalla');
        } else if (err.name === 'NotSupportedError') {
          setError('Captura de pantalla no soportada en este navegador');
        } else {
          setError('Error al iniciar captura de pantalla');
        }
      }
      setIsCapturing(false);
    }
  }, [captureFrame]);

  // Detener captura
  const stopCapturing = useCallback(() => {
    // Detener intervalo
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Detener stream de video
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Limpiar video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
    }

    setIsCapturing(false);
    currentActividadIdRef.current = null;
  }, []);

  // Limpiar screenshots
  const clearScreenshots = useCallback(() => {
    // Revocar todas las URLs de objetos para liberar memoria
    screenshots.forEach(screenshot => {
      if (screenshot.filePath.startsWith('blob:')) {
        URL.revokeObjectURL(screenshot.filePath);
      }
    });
    setScreenshots([]);
  }, [screenshots]);

  // Limpiar screenshots por actividad específica
  const clearScreenshotsByActivity = useCallback((actividadId: number) => {
    setScreenshots(prev => {
      // Revocar URLs de la actividad específica
      const toRemove = prev.filter(s => s.actividadId === actividadId);
      toRemove.forEach(screenshot => {
        if (screenshot.filePath.startsWith('blob:')) {
          URL.revokeObjectURL(screenshot.filePath);
        }
      });
      
      // Retornar screenshots sin los de esta actividad
      return prev.filter(s => s.actividadId !== actividadId);
    });
  }, []);

  // Recargar screenshots (para mantener compatibilidad con la interfaz existente)
  const reloadScreenshots = useCallback(() => {
    // Como ahora los screenshots están en memoria, no necesitamos recargar desde almacenamiento
    // Esta función se mantiene para compatibilidad
    console.log('Screenshots están en memoria, no se requiere recarga');
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopCapturing();
    };
  }, [stopCapturing]);

  return {
    screenshots,
    isCapturing,
    startCapturing,
    stopCapturing,
    clearScreenshots,
    clearScreenshotsByActivity,
    reloadScreenshots,
    error
  };
};