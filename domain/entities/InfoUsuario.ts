export interface InfoUsuario {
  nombre: string;
  apellido?: string; // No está en la DB, lo mantenemos opcional
  avatar?: string;
  nivel?: number;
  fecha_nacimiento?: Date;
  ubicacion?: string;
  enlace_github?: string;
  enlace_web?: string;
  enlace_linkedin?: string;
  idea?: string;
  marco?: string;
  bio?: string;
  username: string;
  correo?: string;
  nombreOrganizacion?:string;
}