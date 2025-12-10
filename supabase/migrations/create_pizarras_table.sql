-- Crear tabla pizarras
CREATE TABLE IF NOT EXISTS public.pizarras (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_usuario UUID NOT NULL,
    pan_offset_x NUMERIC DEFAULT 0,
    pan_offset_y NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_pizarras_id_usuario ON public.pizarras(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pizarras_created_at ON public.pizarras(created_at);
CREATE INDEX IF NOT EXISTS idx_pizarras_usuario_fecha ON public.pizarras(id_usuario, created_at);

-- Habilitar Row Level Security
ALTER TABLE public.pizarras ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios autenticados ver sus propias pizarras
CREATE POLICY "Los usuarios pueden ver sus propias pizarras"
    ON public.pizarras
    FOR SELECT
    USING (auth.uid() = id_usuario);

-- Política para permitir a los usuarios crear sus propias pizarras
CREATE POLICY "Los usuarios pueden crear sus propias pizarras"
    ON public.pizarras
    FOR INSERT
    WITH CHECK (auth.uid() = id_usuario);

-- Política para permitir a los usuarios actualizar sus propias pizarras
CREATE POLICY "Los usuarios pueden actualizar sus propias pizarras"
    ON public.pizarras
    FOR UPDATE
    USING (auth.uid() = id_usuario)
    WITH CHECK (auth.uid() = id_usuario);

-- Política para permitir a los usuarios eliminar sus propias pizarras
CREATE POLICY "Los usuarios pueden eliminar sus propias pizarras"
    ON public.pizarras
    FOR DELETE
    USING (auth.uid() = id_usuario);

-- Política adicional: permitir a usuarios con permisos ver pizarras de otros
-- Esto permite que usuarios con permisos otorgados puedan ver pizarras compartidas
CREATE POLICY "Usuarios con permisos pueden ver pizarras compartidas"
    ON public.pizarras
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.pizarra_permissions
            WHERE pizarra_permissions.id_usuario_propietario = (
                SELECT id
                FROM public.usuario
                WHERE usuario.id_usuario = pizarras.id_usuario
            )
            AND pizarra_permissions.id_usuario_editor = (
                SELECT id
                FROM public.usuario
                WHERE usuario.id_usuario = auth.uid()
            )
            AND pizarra_permissions.aprobado = true
        )
    );

-- Política adicional: permitir a usuarios con permisos actualizar pizarras compartidas
CREATE POLICY "Usuarios con permisos pueden actualizar pizarras compartidas"
    ON public.pizarras
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.pizarra_permissions
            WHERE pizarra_permissions.id_usuario_propietario = (
                SELECT id
                FROM public.usuario
                WHERE usuario.id_usuario = pizarras.id_usuario
            )
            AND pizarra_permissions.id_usuario_editor = (
                SELECT id
                FROM public.usuario
                WHERE usuario.id_usuario = auth.uid()
            )
            AND pizarra_permissions.aprobado = true
        )
    );

-- Función para actualizar el updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pizarras_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_pizarras_updated_at
    BEFORE UPDATE ON public.pizarras
    FOR EACH ROW
    EXECUTE FUNCTION update_pizarras_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.pizarras IS 'Tabla para almacenar las pizarras de los usuarios';
COMMENT ON COLUMN public.pizarras.id IS 'ID único de la pizarra (UUID)';
COMMENT ON COLUMN public.pizarras.id_usuario IS 'ID del usuario propietario de la pizarra (UUID desde auth.users)';
COMMENT ON COLUMN public.pizarras.pan_offset_x IS 'Desplazamiento horizontal del canvas';
COMMENT ON COLUMN public.pizarras.pan_offset_y IS 'Desplazamiento vertical del canvas';
COMMENT ON COLUMN public.pizarras.created_at IS 'Fecha de creación de la pizarra';
COMMENT ON COLUMN public.pizarras.updated_at IS 'Fecha de última actualización de la pizarra';
