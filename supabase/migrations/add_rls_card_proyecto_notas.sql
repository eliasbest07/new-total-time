-- Habilitar RLS en la tabla card_proyecto_notas
ALTER TABLE public.card_proyecto_notas ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT a usuarios autenticados
CREATE POLICY "Allow authenticated users to select card_proyecto_notas"
  ON public.card_proyecto_notas
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Permitir INSERT a usuarios autenticados
CREATE POLICY "Allow authenticated users to insert card_proyecto_notas"
  ON public.card_proyecto_notas
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Permitir UPDATE a usuarios autenticados
CREATE POLICY "Allow authenticated users to update card_proyecto_notas"
  ON public.card_proyecto_notas
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Permitir DELETE a usuarios autenticados
CREATE POLICY "Allow authenticated users to delete card_proyecto_notas"
  ON public.card_proyecto_notas
  FOR DELETE
  USING (auth.role() = 'authenticated');