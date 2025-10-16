// hooks/useScreenshots.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';
import { supabase } from '@/infrastructure/services/SupabaseClient';

interface UseScreenshotsReturn {
  screenshots: Capture[];
  isCapturing: boolean;
  startCapturing: (params: {
    userId: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    onCaptureUpdate?: (url: string) => void;
  }) => Promise<void>;
  stopCapturing: () => void;
  clearScreenshots: () => Promise<void>;
  clearScreenshotsByBloque: (actividadId: string) => Promise<void>;
  reloadScreenshots: (actividadId?: string, userId?: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

const captureRepository = new CaptureRepositorySupabase();

export const useScreenshots = (): UseScreenshotsReturn => {
  const [screenshots, setScreenshots] = useState<Capture[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentContextRef = useRef<{
    userId: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    onCaptureUpdate?: (url: string) => void;
  } | null>(null);

  // Subir imagen a Supabase Storage
  const uploadImage = useCallback(async (blob: Blob, folder: string, fileName: string): Promise<string> => {
    const filePath = `${folder}/${fileName}`;
    console.log(`📁 [UPLOAD] Iniciando subida a Supabase Storage...`);
    console.log(`📁 [UPLOAD] Bucket: capturas, Path: ${filePath}`);
    console.log(`📁 [UPLOAD] Tamaño del blob: ${(blob.size / 1024).toFixed(2)} KB`);

    try {
      const { data, error } = await supabase.storage
        .from('capturas')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ [UPLOAD] Error de Supabase Storage:', error);
        console.error('❌ [UPLOAD] Error code:', error.name);
        console.error('❌ [UPLOAD] Error message:', error.message);
        throw new Error(`Error al subir imagen: ${error.message}`);
      }

      console.log('✅ [UPLOAD] Archivo subido correctamente:', data);

      const { data: urlData } = supabase.storage
        .from('capturas')
        .getPublicUrl(data.path);

      console.log('✅ [UPLOAD] URL pública generada:', urlData.publicUrl);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [UPLOAD] Error inesperado:', error);
      throw error;
    }
  }, []);

  // Iniciar captura
  const startCapturing = useCallback(async (params: {
    userId: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    onCaptureUpdate?: (url: string) => void;
  }) => {
    console.log('🚀 [START CAPTURE] Iniciando proceso de captura con parámetros:', params);

    try {
      setError(null);
      setIsCapturing(true);
      currentContextRef.current = params;

      console.log('🎥 [START CAPTURE] Solicitando permisos de pantalla...');

      // pedir permisos
      mediaStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false
      } as DisplayMediaStreamOptions);

      console.log('✅ [START CAPTURE] Permisos concedidos, stream obtenido');

      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.autoplay = true;
        videoRef.current.muted = true;
        videoRef.current.srcObject = mediaStreamRef.current;
        console.log('✅ [START CAPTURE] Video element creado y configurado');
      }

      // Esperar a que el video esté listo antes de configurar el intervalo
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            console.log('✅ [START CAPTURE] Video metadata cargada');
            videoRef.current?.play().then(() => {
              console.log('✅ [START CAPTURE] Video playing');
              resolve();
            });
          };
        }
      });

      // Esperar un poco más para asegurar que el primer frame está disponible
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ [START CAPTURE] Video completamente inicializado');

      intervalRef.current = setInterval(async () => {
        console.log('🎬 [SCREENSHOT] Iniciando captura de pantalla...');

        if (!videoRef.current || !currentContextRef.current) {
          console.error('❌ [SCREENSHOT] No hay videoRef o contextRef disponible');
          return;
        }

        try {
          const canvas = document.createElement("canvas");

          // Optimización: Reducir resolución si es muy grande
          const maxWidth = 1920;
          const maxHeight = 1080;
          let width = videoRef.current.videoWidth;
          let height = videoRef.current.videoHeight;

          console.log(`📐 [SCREENSHOT] Resolución original: ${width}x${height}`);

          // Verificar que el video tenga dimensiones válidas
          if (width === 0 || height === 0) {
            console.error('❌ [SCREENSHOT] Video sin dimensiones válidas, esperando...');
            return;
          }

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }

          console.log(`📐 [SCREENSHOT] Resolución ajustada: ${width}x${height}`);

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.error('❌ [SCREENSHOT] No se pudo obtener contexto 2D del canvas');
            return;
          }

          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          console.log('✅ [SCREENSHOT] Imagen dibujada en canvas');

          // Optimización: Usar JPEG con compresión (70% calidad) en lugar de PNG
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.7)
          );

          if (!blob) {
            console.error('❌ [SCREENSHOT] No se pudo crear blob de la imagen');
            return;
          }

          console.log(`✅ [SCREENSHOT] Blob creado. Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);

          const fileName = `${Date.now()}.jpg`;
          console.log(`📤 [SCREENSHOT] Subiendo imagen: ${fileName} a carpeta: ${params.actividadId}`);

          const url = await uploadImage(blob, params.actividadId, fileName);
          console.log(`✅ [SCREENSHOT] Imagen subida exitosamente. URL: ${url}`);

          console.log('💾 [SCREENSHOT] Guardando registro en base de datos...', {
            id_usuario: params.userId,
            id_bloque: params.actividadId,
            mision_actividad: params.misionActividad
          });

          const newCapture = await captureRepository.create({
            id_usuario: params.userId,
            img_url: url,
            mision_actividad: params.misionActividad,
            id_bloque: params.actividadId,
            total_trabajado_hoy: params.totalTrabajadoHoy,
            tiempo_tarea_actual: params.tiempoTareaActual
          });

          console.log('✅ [SCREENSHOT] Registro guardado en BD:', newCapture);

          setScreenshots(prev => [newCapture, ...prev]);

          // Notificar la nueva captura
          if (params.onCaptureUpdate) {
            params.onCaptureUpdate(url);
          }

          console.log('🎉 [SCREENSHOT] Captura completada exitosamente');
        } catch (error) {
          console.error('❌ [SCREENSHOT] Error durante el proceso de captura:', error);
          console.error('❌ [SCREENSHOT] Stack trace:', error instanceof Error ? error.stack : 'No stack available');
        }
      }, 300000); // cada 5 minutos

      console.log('⏰ [START CAPTURE] Intervalo de captura configurado (cada 5 minutos)');
      console.log('✅ [START CAPTURE] Proceso de captura iniciado exitosamente');

    } catch (err: any) {
      console.error('❌ [START CAPTURE] Error al iniciar captura:', err);
      console.error('❌ [START CAPTURE] Error message:', err.message);
      setError(err.message);
      setIsCapturing(false);
    }
  }, [uploadImage]);

  // Detener captura
  const stopCapturing = useCallback(() => {
    console.log('⏹️ [STOP CAPTURE] Deteniendo captura...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('✅ [STOP CAPTURE] Intervalo de captura detenido');
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        console.log('🔌 [STOP CAPTURE] Deteniendo track:', track.kind, track.label);
        track.stop();
      });
      mediaStreamRef.current = null;
      console.log('✅ [STOP CAPTURE] Stream de video detenido');
    }

    setIsCapturing(false);
    console.log('✅ [STOP CAPTURE] Captura detenida exitosamente');
  }, []);

  // Limpiar todas
  const clearScreenshots = useCallback(async () => {
    try {
      await captureRepository.deleteAll();
      setScreenshots([]);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Limpiar por bloque
  const clearScreenshotsByBloque = useCallback(async (actividadId: string) => {
    try {
      await captureRepository.deleteByBloque(actividadId);
      setScreenshots(prev => prev.filter(s => s.id_bloque !== actividadId));
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  // Recargar
  const reloadScreenshots = useCallback(async (actividadId?: string, userId?: string) => {
    try {
      setLoading(true);
      let data: Capture[] = [];
      if (actividadId) {
        data = await captureRepository.getByBloque(actividadId);
      } else if (userId) {
        data = await captureRepository.getByUsuario(userId);
      }
      setScreenshots(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    clearScreenshotsByBloque,
    reloadScreenshots,
    error,
    loading,
  };
};
