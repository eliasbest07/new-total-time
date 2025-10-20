'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Página del cliente para obtener capturas de pantalla bajo demanda
 *
 * Esta página toma una captura de la pantalla compartida actualmente,
 * la sube a Supabase, y retorna la URL pública de la imagen.
 *
 * Uso: /api/capture/client?action=get
 *
 * Respuesta:
 * {
 *   "success": true,
 *   "url": "https://supabase-storage-url.com/capturas/...",
 *   "timestamp": 1234567890
 * }
 */
export default function CaptureClientPage() {
  const searchParams = useSearchParams();
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');

    if (action === 'get') {
      handleGetCapture();
    }
  }, [searchParams]);

  const handleGetCapture = async () => {
    try {
      console.log('📸 [CAPTURE CLIENT] Solicitando captura...');
      setIsCapturing(true);
      setError(null);

      // Verificar si existe la función global
      if (typeof window !== 'undefined' && (window as any).pizarraCaptureNow) {
        console.log('✅ [CAPTURE CLIENT] Función pizarraCaptureNow encontrada');

        // Esta función ahora sube a Supabase y retorna la URL
        const imageUrl = await (window as any).pizarraCaptureNow();

        if (imageUrl) {
          setCaptureUrl(imageUrl);
          console.log('✅ [CAPTURE CLIENT] URL de captura obtenida:', imageUrl);
        } else {
          setError('No hay captura de pantalla activa o falló la subida');
          console.error('❌ [CAPTURE CLIENT] No se pudo obtener la URL');
        }
      } else {
        setError('La pizarra no está disponible o no está capturando');
        console.error('❌ [CAPTURE CLIENT] window.pizarraCaptureNow no está disponible');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      console.error('❌ [CAPTURE CLIENT] Error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Si hay URL de captura, renderizar como JSON
  if (captureUrl) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <pre>{JSON.stringify({
          success: true,
          url: captureUrl,
          timestamp: Date.now(),
          message: 'Captura guardada exitosamente en Supabase'
        }, null, 2)}</pre>
      </div>
    );
  }

  // Si hay error, renderizar como JSON
  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <pre>{JSON.stringify({
          success: false,
          error,
          timestamp: Date.now()
        }, null, 2)}</pre>
      </div>
    );
  }

  // Estado de carga
  if (isCapturing) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <pre>{JSON.stringify({
          success: false,
          message: 'Capturando y subiendo a Supabase...',
          timestamp: Date.now()
        }, null, 2)}</pre>
      </div>
    );
  }

  // Instrucciones
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>📸 Capture API Client</h1>
      <p>Esta página toma una captura de pantalla y la sube a Supabase.</p>
      <br />
      <h2>Uso:</h2>
      <p><code>/api/capture/client?action=get</code></p>
      <br />
      <h2>Prerequisitos:</h2>
      <ul>
        <li>✓ La pizarra debe estar abierta en este navegador</li>
        <li>✓ Una misión debe estar corriendo (compartiendo pantalla)</li>
        <li>✓ El usuario debe haber aceptado compartir su pantalla</li>
      </ul>
      <br />
      <h2>Respuesta:</h2>
      <pre>{`{
  "success": true,
  "url": "https://[supabase-url]/storage/v1/object/public/capturas/...",
  "timestamp": 1234567890,
  "message": "Captura guardada exitosamente en Supabase"
}`}</pre>
    </div>
  );
}
