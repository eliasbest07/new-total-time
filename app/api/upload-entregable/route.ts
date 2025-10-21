import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API Route para subir imágenes/archivos de entregables
 * Bucket: entregables
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob;
    const userId = formData.get("userId") as string;
    const cardId = formData.get("cardId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó un archivo" },
        { status: 400 }
      );
    }

    if (!userId || !cardId) {
      return NextResponse.json(
        { success: false, error: "userId y cardId son requeridos" },
        { status: 400 }
      );
    }

    // Generar nombre del archivo
    const timestamp = Date.now();
    const fileExtension = (file as File).name?.split('.').pop() || 'jpg';
    const filename = `${userId}/${cardId}/entrega-${timestamp}.${fileExtension}`;

    // Subir archivo al bucket 'entregables'
    const { data, error } = await supabase.storage
      .from("entregables")
      .upload(filename, file, {
        contentType: (file as File).type || "image/jpeg",
        upsert: false
      });

    if (error) {
      console.error('❌ Error subiendo archivo:', error);
      throw error;
    }

    // Obtener URL pública
    const { data: publicUrl } = supabase.storage
      .from("entregables")
      .getPublicUrl(filename);

    console.log('✅ Archivo de entregable subido:', publicUrl.publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      timestamp: timestamp,
      message: "Archivo de entregable guardado exitosamente en Supabase",
    });
  } catch (error) {
    console.error('❌ Error en upload-entregable:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
