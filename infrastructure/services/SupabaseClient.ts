// src/infrastructure/services/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Cliente singleton de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
