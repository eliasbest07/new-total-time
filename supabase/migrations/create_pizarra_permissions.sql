-- Crear tabla para permisos de edición de pizarra
CREATE TABLE IF NOT EXISTS pizarra_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario_owner INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  id_usuario_editor INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT false,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados: un usuario solo puede tener una solicitud/permiso por dueño
  CONSTRAINT unique_permission UNIQUE (id_usuario_owner, id_usuario_editor)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_pizarra_permissions_owner ON pizarra_permissions(id_usuario_owner);
CREATE INDEX IF NOT EXISTS idx_pizarra_permissions_editor ON pizarra_permissions(id_usuario_editor);
CREATE INDEX IF NOT EXISTS idx_pizarra_permissions_granted ON pizarra_permissions(granted);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pizarra_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pizarra_permissions_updated_at
  BEFORE UPDATE ON pizarra_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_pizarra_permissions_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE pizarra_permissions IS 'Permisos de edición de pizarra entre usuarios';
COMMENT ON COLUMN pizarra_permissions.id_usuario_owner IS 'ID del usuario dueño de la pizarra';
COMMENT ON COLUMN pizarra_permissions.id_usuario_editor IS 'ID del usuario que solicita/tiene permiso de edición';
COMMENT ON COLUMN pizarra_permissions.granted IS 'Indica si el permiso fue otorgado';
COMMENT ON COLUMN pizarra_permissions.requested_at IS 'Fecha y hora de la solicitud';
COMMENT ON COLUMN pizarra_permissions.granted_at IS 'Fecha y hora cuando se otorgó el permiso';
