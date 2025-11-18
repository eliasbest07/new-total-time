import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Validar variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:', {
    supabaseUrl: !!supabaseUrl,
    supabaseKey: !!supabaseKey
  });
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

export async function POST(req: NextRequest) {
  try {
    // Verificar variables de entorno
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: "Error de configuración: Variables de entorno de Supabase no definidas" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as Blob;
    const userEmail = formData.get("userEmail") as string;

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: "Email del usuario es requerido" },
        { status: 400 }
      );
    }

    const filename = `capture-now-${Date.now()}.jpg`;
    const filePath = `${userEmail}/${filename}`;

    const { data, error } = await supabase.storage
      .from("capturas")
      .upload(filePath, file, { contentType: "image/jpeg" });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from("capturas")
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      timestamp: Date.now(),
      message: "Captura guardada exitosamente en Supabase",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}