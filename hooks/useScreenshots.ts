// hooks/useScreenshots.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { CaptureRepositorySupabase } from '@/infrastructure/datasource/SupabaseCaptureRepository';
import { Capture } from '@/domain/entities/Capture';
import { supabase } from '@/infrastructure/services/SupabaseClient';
import { misionActivaRepository } from '@/infrastructure/datasource/SupabaseMisionActivaRepository';

interface UseScreenshotsReturn {
  screenshots: Capture[];
  isCapturing: boolean;
  startCapturing: (params: {
    userId: string;
    userEmail: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    mediaStream?: MediaStream;
    onCaptureUpdate?: (url: string) => void;
    misionActivaId?: string; // ID de la misión activa para actualizar fecha_ultimo_capture
  }) => Promise<void>;
  stopCapturing: () => void;
  captureNow: () => Promise<string | null>;
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
    userEmail: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    mediaStream?: MediaStream;
    onCaptureUpdate?: (url: string) => void;
    misionActivaId?: string;
  } | null>(null);

  // Subir imagen a Supabase Storage
  const uploadImage = useCallback(async (blob: Blob, folder: string, fileName: string): Promise<string> => {
    const filePath = `${folder}/${fileName}`;
    // console.log(`📁 [UPLOAD] Iniciando subida a Supabase Storage...`);
    // console.log(`📁 [UPLOAD] Bucket: capturas, Path: ${filePath}`);
    // console.log(`📁 [UPLOAD] Tamaño del blob: ${(blob.size / 1024).toFixed(2)} KB`);

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

      // console.log('✅ [UPLOAD] Archivo subido correctamente:', data);

      const { data: urlData } = supabase.storage
        .from('capturas')
        .getPublicUrl(data.path);

      // console.log('✅ [UPLOAD] URL pública generada:', urlData.publicUrl);

      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ [UPLOAD] Error inesperado:', error);
      throw error;
    }
  }, []);

  // Iniciar captura
  const startCapturing = useCallback(async (params: {
    userId: string;
    userEmail: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
    mediaStream?: MediaStream;
    onCaptureUpdate?: (url: string) => void;
    misionActivaId?: string;
  }) => {
    // console.log('🚀 [START CAPTURE] Iniciando proceso de captura con parámetros:', params);

    try {
      setError(null);
      setIsCapturing(true);
      currentContextRef.current = params;

      // Si se pasó un mediaStream, usarlo. Si no, pedir permisos
      if (params.mediaStream) {
        // console.log('✅ [START CAPTURE] Usando stream ya obtenido (pasado como parámetro)');
        mediaStreamRef.current = params.mediaStream;
      } else {
        // console.log('🎥 [START CAPTURE] Solicitando permisos de pantalla...');

        // pedir permisos
        mediaStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always"
          },
          audio: false
        } as DisplayMediaStreamOptions);

        // console.log('✅ [START CAPTURE] Permisos concedidos, stream obtenido');
      }

      // Siempre crear un nuevo video element para cada sesión
      videoRef.current = document.createElement("video");
      videoRef.current.autoplay = true;
      videoRef.current.muted = true;
      videoRef.current.srcObject = mediaStreamRef.current;
      // console.log('✅ [START CAPTURE] Video element creado y configurado');

      // Esperar a que el video esté listo antes de configurar el intervalo
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            // console.log('✅ [START CAPTURE] Video metadata cargada');
            videoRef.current?.play().then(() => {
              // console.log('✅ [START CAPTURE] Video playing');
              resolve();
            });
          };
        }
      });

      // Esperar un poco más para asegurar que el primer frame está disponible
      await new Promise(resolve => setTimeout(resolve, 500));
      // console.log('✅ [START CAPTURE] Video completamente inicializado');

      // 📸 TOMAR CAPTURA INICIAL INMEDIATA
      console.log('📸 [CAPTURA INICIAL] Tomando captura de inicio...');
      await capturarPantalla();
      console.log('✅ [CAPTURA INICIAL] Captura de inicio completada');

      intervalRef.current = setInterval(async () => {
        // console.log('🎬 [SCREENSHOT] Iniciando captura de pantalla...');
        await capturarPantalla();
      }, 300000); // cada 5 minutos

      // Función auxiliar para capturar pantalla (evitar duplicación de código)
      async function capturarPantalla() {
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

          // Verificar que el video tenga dimensiones válidas
          if (width === 0 || height === 0) {
            console.error('❌ Video sin dimensiones válidas, esperando...');
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

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.error('❌ No se pudo obtener contexto 2D del canvas');
            return;
          }

          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Optimización: Usar JPEG con compresión (70% calidad) en lugar de PNG
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", 0.7)
          );

          if (!blob) {
            console.error('❌ No se pudo crear blob de la imagen');
            return;
          }

          const fileName = `${Date.now()}.jpg`;

          const url = await uploadImage(blob, params.userEmail, fileName);

          const newCapture = await captureRepository.create({
            id_usuario: params.userId,
            img_url: url,
            mision_actividad: params.misionActividad,
            id_bloque: params.actividadId,
            total_trabajado_hoy: params.totalTrabajadoHoy,
            tiempo_tarea_actual: params.tiempoTareaActual
          });

          setScreenshots(prev => [newCapture, ...prev]);

          // Actualizar fecha_ultimo_capture en misiones_activas
          if (currentContextRef.current?.misionActivaId) {
            try {
              await misionActivaRepository.addCaptureUrl(currentContextRef.current.misionActivaId, url);
              // console.log('✅ [SCREENSHOT] Fecha de último capture actualizada en misiones_activas');
            } catch (error) {
              console.error('❌ [SCREENSHOT] Error actualizando fecha de último capture:', error);
            }
          }

          // Notificar la nueva captura
          if (params.onCaptureUpdate) {
            params.onCaptureUpdate(url);
          }

          // ✅ FIX: Limpiar canvas explícitamente para liberar memoria
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = 0;
          canvas.height = 0;
        } catch (error) {
          console.error('❌ Error durante el proceso de captura:', error);
        }
      }

      // console.log('⏰ [START CAPTURE] Intervalo de captura configurado (cada 5 minutos)');
      // console.log('✅ [START CAPTURE] Proceso de captura iniciado exitosamente');

    } catch (err: any) {
      console.error('❌ [START CAPTURE] Error al iniciar captura:', err);
      console.error('❌ [START CAPTURE] Error message:', err.message);
      setError(err.message);
      setIsCapturing(false);
    }
  }, [uploadImage]);

  // Detener captura
  const stopCapturing = useCallback(() => {
    // console.log('⏹️ [STOP CAPTURE] Deteniendo captura...');

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      // console.log('✅ [STOP CAPTURE] Intervalo de captura detenido');
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        // console.log('🔌 [STOP CAPTURE] Deteniendo track:', track.kind, track.label);
        track.stop();
      });
      mediaStreamRef.current = null;
      // console.log('✅ [STOP CAPTURE] Stream de video detenido');
    }

    // Limpiar el video ref para poder recrearlo en el próximo inicio
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current = null;
      // console.log('✅ [STOP CAPTURE] Video element limpiado');
    }

    // Limpiar el contexto también
    currentContextRef.current = null;

    setIsCapturing(false);
    // console.log('✅ [STOP CAPTURE] Captura detenida exitosamente');
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



  // Tomar captura inmediata (bajo demanda) y subir a Supabase
  const captureNow = useCallback(async (): Promise<string | null> => {
    // console.log('📸 [CAPTURE NOW] Solicitando captura inmediata...');

    if (!videoRef.current || !currentContextRef.current) {
      console.error('❌ [CAPTURE NOW] No hay stream activo o contexto disponible');
      return null;
    }

    if (!isCapturing) {
      console.error('❌ [CAPTURE NOW] No se está capturando pantalla actualmente');
      return null;
    }

    try {
      const canvas = document.createElement("canvas");
      const params = currentContextRef.current;

      // Optimización: Reducir resolución si es muy grande
      const maxWidth = 1920;
      const maxHeight = 1080;
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;

      // Verificar que el video tenga dimensiones válidas
      if (width === 0 || height === 0) {
        console.error('❌ Video sin dimensiones válidas');
        return null;
      }

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error('❌ No se pudo obtener contexto 2D del canvas');
        return null;
      }

      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convertir a blob para subir a Supabase
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.7)
      );

      if (!blob) {
        console.error('❌ No se pudo crear blob de la imagen');
        return null;
      }

      // Subir a Supabase
      const fileName = `capture-now-${Date.now()}.jpg`;

      const url = await uploadImage(blob, params.userEmail, fileName);

      const newCapture = await captureRepository.create({
        id_usuario: params.userId,
        img_url: url,
        mision_actividad: params.misionActividad,
        id_bloque: params.actividadId,
        total_trabajado_hoy: params.totalTrabajadoHoy,
        tiempo_tarea_actual: params.tiempoTareaActual
      });

      // Agregar a la lista de screenshots
      setScreenshots(prev => [newCapture, ...prev]);

      // Notificar la nueva captura si hay callback
      if (params.onCaptureUpdate) {
        params.onCaptureUpdate(url);
      }

      // ✅ FIX: Limpiar canvas explícitamente para liberar memoria
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;

      return url;
    } catch (error) {
      console.error('❌ Error durante captura:', error);
      return null;
    }
  }, [isCapturing, uploadImage]);

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
    captureNow,
    clearScreenshots,
    clearScreenshotsByBloque,
    reloadScreenshots,
    error,
    loading,
  };
};
