import { Rol } from '@/domain/enums/Rol';
import { InfoUsuario } from '@/domain/entities/InfoUsuario';
import { Permiso } from '@/domain/enums/Permiso'

export class Usuario {
    public id: string;
    public email: string;
    public role: Rol;
    public profile: InfoUsuario;
    public barraSalud: number;
    public idOrganizacion?: string;
    public permisos: Permiso[];
    public ultimaActividad: Date;
    public ultimaCaptura: string;
    public admin: boolean;
    public userAuth: string; // UUID del auth de Supabase
    public solicitudNivel?: string;

    constructor(
        id: string,
        email: string,
        role: Rol,
        profile: InfoUsuario,
        barraSalud: number,
        userAuth: string,
        admin: boolean = false,
        idOrganizacion?: string,
        permisos: Permiso[] = [],
        ultimaActividad: Date = new Date(),
        ultimaCaptura: string = '',
        solicitudNivel?: string
    ) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.profile = profile;
        this.barraSalud = barraSalud;
        this.idOrganizacion = idOrganizacion;
        this.permisos = permisos;
        this.ultimaActividad = ultimaActividad;
        this.ultimaCaptura = ultimaCaptura;
        this.admin = admin;
        this.userAuth = userAuth;
        this.solicitudNivel = solicitudNivel;
    }

    // Métodos de utilidad
    public esAdmin(): boolean {
        return this.role === Rol.ADMIN;
    }


    public esMiembro(): boolean {
        return this.role === Rol.MIEMBRO;
    }

  

    public tienePermiso(permiso: Permiso): boolean {
        return this.permisos.includes(permiso);
    }

    public actualizarUltimaActividad(): void {
        this.ultimaActividad = new Date();
    }

    public actualizarBarraSalud(nuevaSalud: number): void {
        this.barraSalud = Math.max(0, Math.min(100, nuevaSalud));
    }

    public getNombreCompleto(): string {
        return `${this.profile.nombre}`;
    }
}