import { Rol } from '@/domain/enums/Rol';
import { InfoUsuario } from '@/domain/entities/InfoUsuario';
import { Permiso } from '@/domain/enums/Permiso'

export class Usuario {
    public id: string;
    public email: string;
    public role: Rol;
    public profile: InfoUsuario;
    public barraVida: number;
    public idOrganizacion: string;
    public permisos: Permiso[];
    public ultimaActividad: Date;
    public ultimaCaptura: string;

    constructor(
        id: string,
        email: string,
        role: Rol,
        profile: InfoUsuario,
        barraVida: number,
        idOrganizacion: string,
        permisos: Permiso[] = [],
        ultimaActividad: Date = new Date(),
        ultimaCaptura: string = ''
    ) {
        this.id = id;
        this.email = email;
        this.role = role;
        this.profile = profile;
        this.barraVida = barraVida;
        this.idOrganizacion = idOrganizacion;
        this.permisos = permisos;
        this.ultimaActividad = ultimaActividad;
        this.ultimaCaptura = ultimaCaptura;
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

    public actualizarBarraVida(nuevaVida: number): void {
        this.barraVida = Math.max(0, Math.min(100, nuevaVida));
    }

    public getNombreCompleto(): string {
        return `${this.profile.nombre}`;
    }
}