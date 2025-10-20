import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint GET para obtener una captura de pantalla inmediata
 *
 * Este endpoint toma una captura de la pantalla compartida actualmente,
 * la sube a Supabase Storage, y retorna la URL pública de la imagen.
 *
 * Uso: GET /api/capture
 *
 * IMPORTANTE: Este endpoint debe ser llamado desde el mismo navegador donde
 * la pizarra está activa y compartiendo pantalla.
 *
 * Respuesta exitosa (200):
 * {
 *   "success": true,
 *   "message": "Para obtener la URL de la captura...",
 *   "endpoint": "/api/capture/client?action=get"
 * }
 *
 * NOTA TÉCNICA:
 * Como Next.js API Routes ejecutan en el servidor, no podemos acceder
 * directamente a las APIs del navegador (getDisplayMedia, canvas, etc.).
 * Por eso, debes usar el endpoint del cliente que ejecuta en el navegador.
 *
 * Flujo completo:
 * 1. Usuario comparte pantalla en la pizarra
 * 2. Se hace una petición a /api/capture/client?action=get
 * 3. La página del cliente captura la pantalla
 * 4. Sube la imagen a Supabase Storage
 * 5. Retorna la URL pública de la imagen
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📸 [API] Solicitud de captura recibida');

    return NextResponse.json({
      success: true,
      message: "Para obtener una captura con URL de Supabase, use uno de estos métodos:",
      methods: {
        recommended: {
          method: "GET",
          endpoint: "/api/capture/client?action=get",
          description: "Abre esta URL en el navegador donde está la pizarra activa",
          response: {
            success: true,
            url: "https://[supabase-url]/storage/v1/object/public/capturas/[id]/capture-now-[timestamp].jpg",
            timestamp: 1234567890,
            message: "Captura guardada exitosamente en Supabase"
          }
        },
        javascript: {
          method: "Direct call",
          code: "const url = await window.pizarraCaptureNow();",
          description: "Llamar directamente desde JavaScript en la consola del navegador",
          returns: "URL pública de Supabase Storage"
        },
        fetch: {
          method: "fetch",
          code: "fetch('/api/capture/client?action=get').then(r => r.text()).then(parseJSON)",
          description: "Hacer fetch desde el mismo origen",
          note: "Necesita parsear el HTML para extraer el JSON"
        }
      },
      prerequisites: [
        "✓ La pizarra debe estar abierta en el navegador",
        "✓ Una misión debe estar corriendo (compartiendo pantalla)",
        "✓ El usuario debe haber aceptado compartir su pantalla"
      ],
      note: "La imagen se guarda automáticamente en Supabase Storage y también en la base de datos"
    });

  } catch (error) {
    console.error('❌ [API] Error al procesar solicitud:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
