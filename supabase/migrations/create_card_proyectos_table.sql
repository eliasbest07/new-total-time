-- Crear tabla card_proyectos para vincular cards con proyectos
-- Similar a card_misiones, esta tabla mantiene la relación entre una card en la pizarra y un proyecto

CREATE TABLE IF NOT EXISTS public.card_proyectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_card UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  id_proyecto BIGINT NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraint para evitar duplicados (una card solo puede referenciar un proyecto)
  UNIQUE(id_card)
);

-- Índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_card_proyectos_id_card ON public.card_proyectos(id_card);
CREATE INDEX IF NOT EXISTS idx_card_proyectos_id_proyecto ON public.card_proyectos(id_proyecto);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_card_proyectos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_card_proyectos_updated_at
  BEFORE UPDATE ON public.card_proyectos
  FOR EACH ROW
  EXECUTE FUNCTION update_card_proyectos_updated_at();

-- Políticas RLS (Row Level Security)
ALTER TABLE public.card_proyectos ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT a usuarios autenticados
CREATE POLICY "Allow authenticated users to select card_proyectos"
  ON public.card_proyectos
  FOR SELECT
  TO authenticated
  USING (true);

-- Permitir INSERT a usuarios autenticados
CREATE POLICY "Allow authenticated users to insert card_proyectos"
  ON public.card_proyectos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Permitir UPDATE a usuarios autenticados
CREATE POLICY "Allow authenticated users to update card_proyectos"
  ON public.card_proyectos
  FOR UPDATE
  TO authenticated
  USING (true);

-- Permitir DELETE a usuarios autenticados
CREATE POLICY "Allow authenticated users to delete card_proyectos"
  ON public.card_proyectos
  FOR DELETE
  TO authenticated
  USING (true);

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.card_proyectos IS 'Tabla de relación entre cards en la pizarra y proyectos de la base de datos';
COMMENT ON COLUMN public.card_proyectos.id_card IS 'UUID del card en la tabla cards';
COMMENT ON COLUMN public.card_proyectos.id_proyecto IS 'ID del proyecto en la tabla proyectos';
