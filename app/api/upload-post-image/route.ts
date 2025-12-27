import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Variables de entorno faltantes:', {
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey
  });
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Error de configuracion: Variables de entorno de Supabase no definidas" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob;
    const idSala = formData.get("idSala") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Archivo es requerido" },
        { status: 400 }
      );
    }

    // Detectar el tipo de contenido
    const fileType = file.type || "image/jpeg";
    const extension = fileType.split("/")[1] || "jpg";

    const filename = `post-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = idSala ? `sala-${idSala}/${filename}` : `general/${filename}`;

    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(filePath, file, { contentType: fileType });

    if (error) {
      console.error("Error subiendo imagen:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("post-images")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error("Error en upload-post-image:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
