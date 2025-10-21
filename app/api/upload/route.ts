import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as Blob;

    const filename = `capture-now-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from("capturas")
      .upload(filename, file, { contentType: "image/jpeg" });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from("capturas")
      .getPublicUrl(filename);

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