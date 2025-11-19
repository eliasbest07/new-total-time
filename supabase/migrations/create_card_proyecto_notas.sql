-- Tabla para relacionar cards de proyecto con cards de tipo text (notas)
-- Similar a card_todos pero para proyectos
CREATE TABLE IF NOT EXISTS card_proyecto_notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_card_proyecto UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  id_card_nota UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0, -- Orden de la nota en la lista
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint para evitar duplicados
  UNIQUE(id_card_proyecto, id_card_nota)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_card_proyecto_notas_proyecto
  ON card_proyecto_notas(id_card_proyecto);

CREATE INDEX IF NOT EXISTS idx_card_proyecto_notas_nota
  ON card_proyecto_notas(id_card_nota);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_card_proyecto_notas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_card_proyecto_notas_timestamp
  BEFORE UPDATE ON card_proyecto_notas
  FOR EACH ROW
  EXECUTE FUNCTION update_card_proyecto_notas_updated_at();

-- Comentarios
COMMENT ON TABLE card_proyecto_notas IS 'Relación entre cards de proyecto y cards de tipo text (notas)';
COMMENT ON COLUMN card_proyecto_notas.id_card_proyecto IS 'UUID del card de proyecto';
COMMENT ON COLUMN card_proyecto_notas.id_card_nota IS 'UUID del card de tipo text (nota)';
COMMENT ON COLUMN card_proyecto_notas.position IS 'Posición/orden de la nota en la lista del proyecto';
