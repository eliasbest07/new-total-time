-- =====================================================================
-- Migración: Sistema de Pizarra de Organización
-- Descripción: Crea las tablas necesarias para una pizarra permanente
--              compartida por todos los miembros de una organización.
--              A diferencia de la pizarra personal que se renueva
--              diariamente, esta pizarra persiste indefinidamente.
-- =====================================================================

-- =====================================================================
-- TABLA: pizarra_organizacion
-- Descripción: Una pizarra por organización. Almacena el estado del
--              canvas (posición pan/zoom). Es permanente y no se borra.
-- =====================================================================
CREATE TABLE IF NOT EXISTS pizarra_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_organizacion UUID NOT NULL UNIQUE,
  pan_offset_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  pan_offset_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  zoom_level DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Una pizarra por organización
  CONSTRAINT fk_organizacion
    FOREIGN KEY (id_organizacion)
    REFERENCES organizacion(id)
    ON DELETE CASCADE
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pizarra_organizacion_org
  ON pizarra_organizacion(id_organizacion);

-- Comentarios para documentación
COMMENT ON TABLE pizarra_organizacion IS
  'Pizarra permanente compartida por organización. No se renueva diariamente.';
COMMENT ON COLUMN pizarra_organizacion.id_organizacion IS
  'ID de la organización dueña de esta pizarra';
COMMENT ON COLUMN pizarra_organizacion.pan_offset_x IS
  'Offset horizontal del canvas (para navegación)';
COMMENT ON COLUMN pizarra_organizacion.pan_offset_y IS
  'Offset vertical del canvas (para navegación)';
COMMENT ON COLUMN pizarra_organizacion.zoom_level IS
  'Nivel de zoom del canvas';

-- =====================================================================
-- TABLA: pizarra_organizacion_permisos
-- Descripción: Define qué usuarios pueden EDITAR la pizarra.
--              Por defecto, todos los miembros de la organización
--              pueden VER la pizarra. Solo los usuarios con permiso
--              explícito pueden editarla.
-- =====================================================================
CREATE TABLE IF NOT EXISTS pizarra_organizacion_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_organizacion UUID NOT NULL,
  id_usuario INTEGER NOT NULL,
  puede_editar BOOLEAN NOT NULL DEFAULT false,
  otorgado_por INTEGER NULL,
  otorgado_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_pizarra_org_permisos_organizacion
    FOREIGN KEY (id_organizacion)
    REFERENCES organizacion(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pizarra_org_permisos_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuario(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_pizarra_org_permisos_otorgante
    FOREIGN KEY (otorgado_por)
    REFERENCES usuario(id)
    ON DELETE SET NULL,

  -- Evitar duplicados: un usuario solo puede tener un permiso por organización
  CONSTRAINT unique_org_usuario_permiso
    UNIQUE (id_organizacion, id_usuario)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pizarra_org_permisos_org
  ON pizarra_organizacion_permisos(id_organizacion);
CREATE INDEX IF NOT EXISTS idx_pizarra_org_permisos_usuario
  ON pizarra_organizacion_permisos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_pizarra_org_permisos_editar
  ON pizarra_organizacion_permisos(puede_editar);

-- Comentarios para documentación
COMMENT ON TABLE pizarra_organizacion_permisos IS
  'Permisos de edición para pizarra de organización. Todos pueden ver, solo autorizados pueden editar.';
COMMENT ON COLUMN pizarra_organizacion_permisos.puede_editar IS
  'true si el usuario puede editar la pizarra de la organización';
COMMENT ON COLUMN pizarra_organizacion_permisos.otorgado_por IS
  'ID del usuario (admin) que otorgó el permiso';

-- =====================================================================
-- TABLA: cards_organizacion
-- Descripción: Cards/tarjetas de la pizarra de organización.
--              Similar a la tabla 'cards' pero específica para org.
-- =====================================================================
CREATE TABLE IF NOT EXISTS cards_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pizarra_organizacion UUID NOT NULL,
  card_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  content TEXT,
  x DOUBLE PRECISION NOT NULL DEFAULT 0,
  y DOUBLE PRECISION NOT NULL DEFAULT 0,
  width DOUBLE PRECISION NOT NULL DEFAULT 200,
  height DOUBLE PRECISION NOT NULL DEFAULT 150,
  font_size INTEGER NOT NULL DEFAULT 14,
  z_index INTEGER NOT NULL DEFAULT 0,
  color TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_cards_org_pizarra
    FOREIGN KEY (id_pizarra_organizacion)
    REFERENCES pizarra_organizacion(id)
    ON DELETE CASCADE,

  -- Evitar duplicados de card_id en la misma pizarra
  CONSTRAINT unique_card_id_per_pizarra_org
    UNIQUE (id_pizarra_organizacion, card_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_cards_org_pizarra
  ON cards_organizacion(id_pizarra_organizacion);
CREATE INDEX IF NOT EXISTS idx_cards_org_type
  ON cards_organizacion(type);
CREATE INDEX IF NOT EXISTS idx_cards_org_card_id
  ON cards_organizacion(card_id);

-- Comentarios para documentación
COMMENT ON TABLE cards_organizacion IS
  'Tarjetas/cards de la pizarra de organización';
COMMENT ON COLUMN cards_organizacion.card_id IS
  'ID de la tarjeta en el frontend (ej: "mision-1", "todo-2")';
COMMENT ON COLUMN cards_organizacion.type IS
  'Tipo de card: mision, todo, note, proyecto, actividad, usuario, image, recurso';
COMMENT ON COLUMN cards_organizacion.metadata IS
  'Datos adicionales específicos del tipo de card (JSON)';

-- =====================================================================
-- TABLA: card_misiones_organizacion
-- Descripción: Datos específicos para cards de tipo "mision" en la
--              pizarra de organización.
-- =====================================================================
CREATE TABLE IF NOT EXISTS card_misiones_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_card UUID NOT NULL UNIQUE,
  id_mision BIGINT NOT NULL,
  is_running BOOLEAN NOT NULL DEFAULT false,
  last_capture_url TEXT,
  id_usuario_asignado INTEGER,
  estado TEXT DEFAULT 'pendiente',
  card_todos TEXT[] DEFAULT '{}',
  fecha_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_card_mision_org_card
    FOREIGN KEY (id_card)
    REFERENCES cards_organizacion(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_card_mision_org_usuario
    FOREIGN KEY (id_usuario_asignado)
    REFERENCES usuario(id)
    ON DELETE SET NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_card_misiones_org_card
  ON card_misiones_organizacion(id_card);
CREATE INDEX IF NOT EXISTS idx_card_misiones_org_mision
  ON card_misiones_organizacion(id_mision);
CREATE INDEX IF NOT EXISTS idx_card_misiones_org_usuario
  ON card_misiones_organizacion(id_usuario_asignado);
CREATE INDEX IF NOT EXISTS idx_card_misiones_org_estado
  ON card_misiones_organizacion(estado);

-- Comentarios para documentación
COMMENT ON TABLE card_misiones_organizacion IS
  'Datos específicos de cards de tipo mision en pizarra de organización';
COMMENT ON COLUMN card_misiones_organizacion.id_mision IS
  'ID de la misión asociada';
COMMENT ON COLUMN card_misiones_organizacion.is_running IS
  'Indica si la misión está en ejecución';
COMMENT ON COLUMN card_misiones_organizacion.id_usuario_asignado IS
  'Usuario asignado a esta misión';
COMMENT ON COLUMN card_misiones_organizacion.estado IS
  'Estado: pendiente, en_progreso, entregada, revisada, completada';
COMMENT ON COLUMN card_misiones_organizacion.card_todos IS
  'Array de IDs de cards TODO vinculados a esta misión';

-- =====================================================================
-- TABLA: card_connections_organizacion
-- Descripción: Conexiones/líneas entre cards en la pizarra de org.
-- =====================================================================
CREATE TABLE IF NOT EXISTS card_connections_organizacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_pizarra_organizacion UUID NOT NULL,
  connection_id TEXT NOT NULL,
  from_card_id TEXT,
  to_card_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_connections_org_pizarra
    FOREIGN KEY (id_pizarra_organizacion)
    REFERENCES pizarra_organizacion(id)
    ON DELETE CASCADE,

  -- Evitar duplicados
  CONSTRAINT unique_connection_id_per_pizarra_org
    UNIQUE (id_pizarra_organizacion, connection_id)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_connections_org_pizarra
  ON card_connections_organizacion(id_pizarra_organizacion);
CREATE INDEX IF NOT EXISTS idx_connections_org_from
  ON card_connections_organizacion(from_card_id);
CREATE INDEX IF NOT EXISTS idx_connections_org_to
  ON card_connections_organizacion(to_card_id);

-- Comentarios para documentación
COMMENT ON TABLE card_connections_organizacion IS
  'Conexiones visuales entre cards en la pizarra de organización';
COMMENT ON COLUMN card_connections_organizacion.connection_id IS
  'ID de la conexión en el frontend';
COMMENT ON COLUMN card_connections_organizacion.from_card_id IS
  'Card origen de la conexión';
COMMENT ON COLUMN card_connections_organizacion.to_card_id IS
  'Card destino de la conexión';

-- =====================================================================
-- TRIGGERS: Actualización automática de updated_at
-- =====================================================================

-- Función genérica para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para pizarra_organizacion
CREATE TRIGGER trigger_update_pizarra_organizacion_updated_at
  BEFORE UPDATE ON pizarra_organizacion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para pizarra_organizacion_permisos
CREATE TRIGGER trigger_update_pizarra_org_permisos_updated_at
  BEFORE UPDATE ON pizarra_organizacion_permisos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para cards_organizacion
CREATE TRIGGER trigger_update_cards_organizacion_updated_at
  BEFORE UPDATE ON cards_organizacion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para card_misiones_organizacion
CREATE TRIGGER trigger_update_card_misiones_org_updated_at
  BEFORE UPDATE ON card_misiones_organizacion
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- POLÍTICAS RLS (Row Level Security) - Opcional pero recomendado
-- =====================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE pizarra_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE pizarra_organizacion_permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_misiones_organizacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_connections_organizacion ENABLE ROW LEVEL SECURITY;

-- Política: Todos los miembros de la organización pueden VER la pizarra
CREATE POLICY "Miembros pueden ver pizarra de su organización"
  ON pizarra_organizacion FOR SELECT
  USING (
    id_organizacion IN (
      SELECT idOrganizacion
      FROM usuario
      WHERE user_auth = auth.uid()
    )
  );

-- Política: Solo usuarios con permiso pueden EDITAR
CREATE POLICY "Usuarios con permiso pueden editar pizarra"
  ON pizarra_organizacion FOR UPDATE
  USING (
    id_organizacion IN (
      SELECT pop.id_organizacion
      FROM pizarra_organizacion_permisos pop
      INNER JOIN usuario u ON u.id = pop.id_usuario
      WHERE u.user_auth = auth.uid()
        AND pop.puede_editar = true
    )
    OR
    -- O es el admin de la organización
    id_organizacion IN (
      SELECT o.id
      FROM organizacion o
      WHERE o.idAdmin = auth.uid()
    )
  );

-- Política: Admins pueden crear pizarra de organización
CREATE POLICY "Admins pueden crear pizarra de organización"
  ON pizarra_organizacion FOR INSERT
  WITH CHECK (
    id_organizacion IN (
      SELECT o.id
      FROM organizacion o
      WHERE o.idAdmin = auth.uid()
    )
  );

-- Políticas similares para cards_organizacion
CREATE POLICY "Miembros pueden ver cards de su organización"
  ON cards_organizacion FOR SELECT
  USING (
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN usuario u ON u.idOrganizacion = po.id_organizacion
      WHERE u.user_auth = auth.uid()
    )
  );

CREATE POLICY "Usuarios con permiso pueden modificar cards"
  ON cards_organizacion FOR ALL
  USING (
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN pizarra_organizacion_permisos pop
        ON pop.id_organizacion = po.id_organizacion
      INNER JOIN usuario u ON u.id = pop.id_usuario
      WHERE u.user_auth = auth.uid()
        AND pop.puede_editar = true
    )
    OR
    -- O es el admin
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN organizacion o ON o.id = po.id_organizacion
      WHERE o.idAdmin = auth.uid()
    )
  );

-- Políticas para card_connections_organizacion
CREATE POLICY "Miembros pueden ver conexiones de su organización"
  ON card_connections_organizacion FOR SELECT
  USING (
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN usuario u ON u.idOrganizacion = po.id_organizacion
      WHERE u.user_auth = auth.uid()
    )
  );

CREATE POLICY "Usuarios con permiso pueden modificar conexiones"
  ON card_connections_organizacion FOR ALL
  USING (
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN pizarra_organizacion_permisos pop
        ON pop.id_organizacion = po.id_organizacion
      INNER JOIN usuario u ON u.id = pop.id_usuario
      WHERE u.user_auth = auth.uid()
        AND pop.puede_editar = true
    )
    OR
    id_pizarra_organizacion IN (
      SELECT po.id
      FROM pizarra_organizacion po
      INNER JOIN organizacion o ON o.id = po.id_organizacion
      WHERE o.idAdmin = auth.uid()
    )
  );

-- Políticas para card_misiones_organizacion
CREATE POLICY "Miembros pueden ver misiones de su organización"
  ON card_misiones_organizacion FOR SELECT
  USING (
    id_card IN (
      SELECT co.id
      FROM cards_organizacion co
      INNER JOIN pizarra_organizacion po
        ON po.id = co.id_pizarra_organizacion
      INNER JOIN usuario u ON u.idOrganizacion = po.id_organizacion
      WHERE u.user_auth = auth.uid()
    )
  );

CREATE POLICY "Usuarios con permiso pueden modificar misiones"
  ON card_misiones_organizacion FOR ALL
  USING (
    id_card IN (
      SELECT co.id
      FROM cards_organizacion co
      INNER JOIN pizarra_organizacion po
        ON po.id = co.id_pizarra_organizacion
      INNER JOIN pizarra_organizacion_permisos pop
        ON pop.id_organizacion = po.id_organizacion
      INNER JOIN usuario u ON u.id = pop.id_usuario
      WHERE u.user_auth = auth.uid()
        AND pop.puede_editar = true
    )
    OR
    id_card IN (
      SELECT co.id
      FROM cards_organizacion co
      INNER JOIN pizarra_organizacion po
        ON po.id = co.id_pizarra_organizacion
      INNER JOIN organizacion o ON o.id = po.id_organizacion
      WHERE o.idAdmin = auth.uid()
    )
  );

-- Políticas para permisos (solo admins pueden gestionar)
CREATE POLICY "Admins pueden gestionar permisos"
  ON pizarra_organizacion_permisos FOR ALL
  USING (
    id_organizacion IN (
      SELECT o.id
      FROM organizacion o
      WHERE o.idAdmin = auth.uid()
    )
  );

CREATE POLICY "Usuarios pueden ver sus propios permisos"
  ON pizarra_organizacion_permisos FOR SELECT
  USING (
    id_usuario IN (
      SELECT u.id
      FROM usuario u
      WHERE u.user_auth = auth.uid()
    )
  );

-- =====================================================================
-- FIN DE MIGRACIÓN
-- =====================================================================
