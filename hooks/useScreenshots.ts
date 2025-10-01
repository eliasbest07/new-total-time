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
  } | null>(null);

  // Subir imagen a Supabase Storage
  const uploadImage = useCallback(async (blob: Blob, folder: string, fileName: string): Promise<string> => {
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('capturas')
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    const { data: urlData } = supabase.storage
      .from('capturas')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  }, []);

  // Iniciar captura
  const startCapturing = useCallback(async (params: {
    userId: string;
    actividadId: string;
    misionActividad: string;
    totalTrabajadoHoy?: string;
    tiempoTareaActual?: string;
  }) => {
    try {
      setError(null);
      setIsCapturing(true);
      currentContextRef.current = params;

      // pedir permisos
      mediaStreamRef.current = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always"
        },
        audio: false
      } as DisplayMediaStreamOptions);

      if (!videoRef.current) {
        videoRef.current = document.createElement("video");
        videoRef.current.autoplay = true;
        videoRef.current.srcObject = mediaStreamRef.current;
      }

      intervalRef.current = setInterval(async () => {
        if (!videoRef.current || !currentContextRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );

        if (blob) {
          const fileName = `${Date.now()}.png`;
          const url = await uploadImage(blob, params.actividadId, fileName);

          const newCapture = await captureRepository.create({
            id_usuario: params.userId,
            img_url: url,
            mision_actividad: params.misionActividad,
            id_bloque: params.actividadId,
            total_trabajado_hoy: params.totalTrabajadoHoy,
            tiempo_tarea_actual: params.tiempoTareaActual
          });

          setScreenshots(prev => [newCapture, ...prev]);
        }
      }, 50000); // cada 10s

    } catch (err: any) {
      setError(err.message);
      setIsCapturing(false);
    }
  }, [uploadImage]);

  // Detener captura
  const stopCapturing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCapturing(false);
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
