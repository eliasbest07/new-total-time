// src/infrastructure/repositories/SupabaseAuthRepository.ts
import { supabase } from "@/infrastructure/services/SupabaseClient";
import { AuthRepository } from "@/infrastructure/repositories/AuthRepository";
import { Usuario } from "@/domain/entities/Usuario";
import { Rol } from "@/domain/enums/Rol";
import { InfoUsuario } from "@/domain/entities/InfoUsuario";

export class SupabaseAuthRepository implements AuthRepository {
    async login(email: string, password: string): Promise<Usuario | null> {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) return null;
        return this.mapToDomainUser(data.user);
    }

    async register(email: string, password: string): Promise<Usuario | null> {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error || !data.user) return null;
        return this.mapToDomainUser(data.user);
    }

    async logout(): Promise<void> {
        await supabase.auth.signOut();
    }

    async getCurrentUser(): Promise<Usuario | null> {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) return null;
        return this.mapToDomainUser(data.user);
    }

    // 🔑 Mapear el user de supabase al dominio Usuario
    private mapToDomainUser(supabaseUser: any): Usuario {
        const profile: InfoUsuario = {
            nombre: supabaseUser.user_metadata?.nombre || "",
            apellido: supabaseUser.user_metadata?.apellido || "",
            avatar: supabaseUser.user_metadata?.avatar_url,
            nivel: supabaseUser.user_metadata?.nivel,
            fecha_nacimiento: supabaseUser.user_metadata?.fecha_nacimiento ? new Date(supabaseUser.user_metadata.fecha_nacimiento) : undefined,
            ubicacion: supabaseUser.user_metadata?.ubicacion,
            enlace_github: supabaseUser.user_metadata?.enlace_github,
            enlace_web: supabaseUser.user_metadata?.enlace_web,
            enlace_linkedin: supabaseUser.user_metadata?.enlace_linkedin,
        };

        return new Usuario(
            supabaseUser.id,
            supabaseUser.email,
            Rol.MIEMBRO, // 🔧 por defecto, luego puedes cargarlo desde DB
            profile,
            100, // barraVida por defecto
            supabaseUser.user_metadata?.organization_id || "", // idOrganizacion
            [], // permisos vacíos por defecto
            new Date(), // ultimaActividad
            "" // ultimaCaptura vacía por defecto
        );
    }
}
