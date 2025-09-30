import { useState, useEffect, useRef, useCallback } from 'react';

interface Screenshot {
  id: string;
  timestamp: number;
  dataUrl: string;
  actividadId: number;
}

interface UseScreenshotsReturn {
  screenshots: Screenshot[];
  isCapturing: boolean;
  startCapturing: (actividadId: number) => Promise<void>;
  stopCapturing: () => void;
  clearScreenshots: () => void;
  reloadScreenshots: () => void;
  error: string | null;
}

export const useScreenshots = (): UseScreenshotsReturn => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>(() => {
    // Cargar screenshots del localStorage al inicializar
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('screenshots');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentActividadIdRef = useRef<number | null>(null);

  // Función para capturar un frame del video
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !currentActividadIdRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const newScreenshot: Screenshot = {
        id: `screenshot-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        dataUrl,
        actividadId: currentActividadIdRef.current
      };

      setScreenshots(prev => {
        const updated = [...prev, newScreenshot];
        // Guardar en localStorage
        localStorage.setItem('screenshots', JSON.stringify(updated));
        return updated;
      });

    } catch (err) {
      console.error('Error al capturar frame:', err);
      setError('Error al capturar pantalla');
    }
  }, []);

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
    setScreenshots([]);
    // Limpiar del localStorage
    localStorage.removeItem('screenshots');
  }, []);

  // Recargar screenshots desde localStorage
  const reloadScreenshots = useCallback(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('screenshots');
      setScreenshots(saved ? JSON.parse(saved) : []);
    }
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
    reloadScreenshots,
    error
  };
};