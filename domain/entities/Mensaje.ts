export class Mensaje {
    public id: string;
    public idEmisor: string;
    public idReceptor: string;
    public texto: string;
    public leido: boolean;
    public createdAt: Date;
    public updatedAt: Date;
    public idConversacion?: string;
    public idCardRef?: string | null;

    constructor(
        id: string,
        idEmisor: string,
        idReceptor: string,
        texto: string,
        leido: boolean = false,
        createdAt: Date = new Date(),
        updatedAt: Date = new Date(),
        idConversacion?: string,
        idCardRef?: string | null
    ) {
        this.id = id;
        this.idEmisor = idEmisor;
        this.idReceptor = idReceptor;
        this.texto = texto;
        this.leido = leido;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.idConversacion = idConversacion;
        this.idCardRef = idCardRef;
    }

    // Método para verificar si el mensaje es del usuario actual
    public esDelUsuario(userId: string): boolean {
        return this.idEmisor === userId;
    }

    // Método para marcar como leído
    public marcarComoLeido(): void {
        this.leido = true;
        this.updatedAt = new Date();
    }

    // Método para obtener el ID de conversación manualmente
    public static generarIdConversacion(userId1: string, userId2: string): string {
        return userId1 < userId2
            ? `${userId1}-${userId2}`
            : `${userId2}-${userId1}`;
    }
}
