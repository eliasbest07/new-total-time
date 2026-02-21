import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const importUrl = searchParams.get('url');

    if (!importUrl) {
      return NextResponse.json(
        { error: 'Parámetro "url" requerido' },
        { status: 400 }
      );
    }

    console.log('🚀 [FETCH-IMPORT] Fetching desde:', importUrl);

    // Hacer el fetch del lado del servidor (sin CORS)
    const response = await fetch(importUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error('❌ [FETCH-IMPORT] Error HTTP:', response.status);
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json() as unknown;
    console.log('✅ [FETCH-IMPORT] JSON recibido:', Array.isArray(data) ? (data as unknown[]).length : 'N/A', 'items');

    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [FETCH-IMPORT] Error:', errorMessage);
    return NextResponse.json(
      { error: `Error al procesar la URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}
