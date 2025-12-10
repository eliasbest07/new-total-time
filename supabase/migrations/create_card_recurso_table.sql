-- Crear tabla card_recurso para relacionar cards con recursos
CREATE TABLE IF NOT EXISTS public.card_recurso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    id_card UUID NOT NULL,
    id_recurso INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_card_recurso_id_card ON public.card_recurso(id_card);
CREATE INDEX IF NOT EXISTS idx_card_recurso_id_recurso ON public.card_recurso(id_recurso);

-- Habilitar Row Level Security
ALTER TABLE public.card_recurso ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver relaciones de sus propias cards
CREATE POLICY "Los usuarios pueden ver sus card_recurso"
    ON public.card_recurso
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_recurso.id_card
            AND EXISTS (
                SELECT 1 FROM public.pizarras
                WHERE pizarras.id = cards.id_pizarra
                AND pizarras.id_usuario = auth.uid()
            )
        )
    );

-- Política: Los usuarios pueden crear relaciones para sus propias cards
CREATE POLICY "Los usuarios pueden crear sus card_recurso"
    ON public.card_recurso
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_recurso.id_card
            AND EXISTS (
                SELECT 1 FROM public.pizarras
                WHERE pizarras.id = cards.id_pizarra
                AND pizarras.id_usuario = auth.uid()
            )
        )
    );

-- Política: Los usuarios pueden actualizar relaciones de sus propias cards
CREATE POLICY "Los usuarios pueden actualizar sus card_recurso"
    ON public.card_recurso
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_recurso.id_card
            AND EXISTS (
                SELECT 1 FROM public.pizarras
                WHERE pizarras.id = cards.id_pizarra
                AND pizarras.id_usuario = auth.uid()
            )
        )
    );

-- Política: Los usuarios pueden eliminar relaciones de sus propias cards
CREATE POLICY "Los usuarios pueden eliminar sus card_recurso"
    ON public.card_recurso
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.cards
            WHERE cards.id = card_recurso.id_card
            AND EXISTS (
                SELECT 1 FROM public.pizarras
                WHERE pizarras.id = cards.id_pizarra
                AND pizarras.id_usuario = auth.uid()
            )
        )
    );

-- Función para actualizar el updated_at automáticamente
CREATE OR REPLACE FUNCTION update_card_recurso_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_card_recurso_updated_at
    BEFORE UPDATE ON public.card_recurso
    FOR EACH ROW
    EXECUTE FUNCTION update_card_recurso_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE public.card_recurso IS 'Tabla de relación entre cards y recursos';
COMMENT ON COLUMN public.card_recurso.id IS 'ID único de la relación';
COMMENT ON COLUMN public.card_recurso.id_card IS 'ID de la card (UUID de tabla cards)';
COMMENT ON COLUMN public.card_recurso.id_recurso IS 'ID del recurso (integer de tabla recursos)';
