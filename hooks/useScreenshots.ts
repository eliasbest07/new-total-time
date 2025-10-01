import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from "@/infrastructure/services/SupabaseClient";

interface Screenshot {
  id: string;
  timestamp: number;
  fileName: string;
  filePath: string; // URL pública de Supabase
  actividadId: number;
}

interface UseScreenshotsReturn {
  screenshots: Screenshot[];
  isCapturing: boolean;
  startCapturing: (actividadId: number) => Promise<void>;
  stopCapturing: () => void;
  clearScreenshots: () => void;
  clearScreenshotsByActivity: (actividadId: number) => void;
  reloadScreenshots: (actividadId?: number) => Promise<void>;
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

  // Función para subir archivo a Supabase Storage
  const uploadToSupabase = useCallback(async (blob: Blob, fileName: string, actividadId: number): Promise<string> => {
    try {
      console.log('📤 Subiendo captura a Supabase...', fileName);

      // Subir archivo al bucket 'capturas'
      const { data, error: uploadError } = await supabase.storage
        .from('capturas')
        .upload(`actividad_${actividadId}/${fileName}`, blob, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error al subir a Supabase:', uploadError);
        throw uploadError;
      }

      console.log('✅ Archivo subido:', data.path);

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('capturas')
        .getPublicUrl(data.path);

      console.log('🔗 URL pública generada:', urlData.publicUrl);

      return urlData.publicUrl;

    } catch (err) {
      console.error('❌ Error en uploadToSupabase:', err);
      throw err;
    }
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
      
      console.log('📸 Capturando frame...');

      // Convertir canvas a blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const timestamp = Date.now();
        const fileName = `screenshot_${timestamp}.png`;
        
        try {
          // Subir a Supabase Storage
          const publicUrl = await uploadToSupabase(blob, fileName, currentActividadIdRef.current!);
          
          const newScreenshot: Screenshot = {
            id: `screenshot-${timestamp}-${Math.random()}`,
            timestamp,
            fileName,
            filePath: publicUrl,
            actividadId: currentActividadIdRef.current!
          };

          setScreenshots(prev => [...prev, newScreenshot]);
          console.log('✅ Screenshot guardado y agregado al estado');
          
        } catch (err) {
          console.error('Error al guardar captura:', err);
          setError('Error al guardar captura en el servidor');
        }
      }, 'image/png', 0.9);

    } catch (err) {
      console.error('Error al capturar frame:', err);
      setError('Error al capturar pantalla');
    }
  }, [uploadToSupabase]);

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

      console.log('🎥 Solicitando permiso de captura de pantalla...');

      // Solicitar permiso para capturar pantalla
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false
      });

      console.log('✅ Permiso concedido, stream obtenido');

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
      }, 300000);

      // Detectar cuando el usuario detiene la compartición de pantalla
      stream.getVideoTracks()[0].onended = () => {
        stopCapturing();
      };

    } catch (err) {
      console.error('❌ Error al iniciar captura:', err);
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
    console.log('⏹️ Deteniendo captura...');
    
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

  // Recargar screenshots desde Supabase
  const reloadScreenshots = useCallback(async (actividadId?: number) => {
    try {
      console.log('🔄 Recargando screenshots desde Supabase...');

      let path = '';
      if (actividadId) {
        path = `actividad_${actividadId}`;
      }

      // Listar archivos en el bucket
      const { data: files, error: listError } = await supabase.storage
        .from('capturas')
        .list(path, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) {
        console.error('Error al listar archivos:', listError);
        return;
      }

      if (!files || files.length === 0) {
        console.log('No se encontraron screenshots');
        setScreenshots([]);
        return;
      }

      // Convertir archivos a Screenshots
      const loadedScreenshots: Screenshot[] = files
        .filter(file => file.name.endsWith('.png'))
        .map(file => {
          const fullPath = path ? `${path}/${file.name}` : file.name;
          const { data: urlData } = supabase.storage
            .from('capturas')
            .getPublicUrl(fullPath);

          // Extraer timestamp del nombre del archivo
          const timestampMatch = file.name.match(/screenshot_(\d+)\.png/);
          const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();

          // Extraer actividadId del path
          const actividadMatch = fullPath.match(/actividad_(\d+)/);
          const extractedActividadId = actividadMatch ? parseInt(actividadMatch[1]) : 0;

          return {
            id: `screenshot-${timestamp}-${Math.random()}`,
            timestamp,
            fileName: file.name,
            filePath: urlData.publicUrl,
            actividadId: extractedActividadId
          };
        });

      setScreenshots(loadedScreenshots);
      console.log(`✅ ${loadedScreenshots.length} screenshots cargados`);

    } catch (err) {
      console.error('Error al recargar screenshots:', err);
      setError('Error al cargar capturas desde el servidor');
    }
  }, []);

  // Limpiar screenshots (eliminar de Supabase)
  const clearScreenshots = useCallback(async () => {
    try {
      console.log('🗑️ Eliminando todos los screenshots...');

      // Obtener todos los archivos
      const { data: files, error: listError } = await supabase.storage
        .from('capturas')
        .list('', {
          limit: 1000
        });

      if (listError) {
        console.error('Error al listar archivos:', listError);
        return;
      }

      if (!files || files.length === 0) {
        setScreenshots([]);
        return;
      }

      // Eliminar cada carpeta/archivo
      for (const file of files) {
        const { error: deleteError } = await supabase.storage
          .from('capturas')
          .remove([file.name]);

        if (deleteError) {
          console.error('Error al eliminar:', deleteError);
        }
      }

      setScreenshots([]);
      console.log('✅ Screenshots eliminados');

    } catch (err) {
      console.error('Error al limpiar screenshots:', err);
      setError('Error al eliminar capturas');
    }
  }, []);

  // Limpiar screenshots por actividad específica
  const clearScreenshotsByActivity = useCallback(async (actividadId: number) => {
    try {
      console.log(`🗑️ Eliminando screenshots de actividad ${actividadId}...`);

      const folderPath = `actividad_${actividadId}`;

      // Listar archivos de la actividad
      const { data: files, error: listError } = await supabase.storage
        .from('capturas')
        .list(folderPath);

      if (listError) {
        console.error('Error al listar archivos:', listError);
        return;
      }

      if (!files || files.length === 0) {
        setScreenshots(prev => prev.filter(s => s.actividadId !== actividadId));
        return;
      }

      // Eliminar archivos
      const filePaths = files.map(file => `${folderPath}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from('capturas')
        .remove(filePaths);

      if (deleteError) {
        console.error('Error al eliminar archivos:', deleteError);
      }

      // Actualizar estado local
      setScreenshots(prev => prev.filter(s => s.actividadId !== actividadId));
      console.log('✅ Screenshots de la actividad eliminados');

    } catch (err) {
      console.error('Error al limpiar screenshots por actividad:', err);
      setError('Error al eliminar capturas de la actividad');
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
    clearScreenshotsByActivity,
    reloadScreenshots,
    error
  };
};