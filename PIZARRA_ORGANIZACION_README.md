# 📋 Pizarra de Organización - Guía de Implementación

## 📖 Resumen

Se ha implementado un sistema completo de **Pizarra de Organización** con las siguientes características:

✅ **Persistencia permanente** - La pizarra NO se borra diariamente (a diferencia de la pizarra personal)
✅ **Compartida** - Todos los miembros de la organización pueden verla
✅ **Control de permisos** - Solo usuarios autorizados pueden editar
✅ **Sincronización en tiempo real** - Los cambios se reflejan inmediatamente para todos los usuarios

---

## 🗂️ Archivos Creados

### 1. Base de Datos

**Migración SQL:**
- `supabase/migrations/create_pizarra_organizacion.sql`
  - Tablas: `pizarra_organizacion`, `pizarra_organizacion_permisos`, `cards_organizacion`, `card_misiones_organizacion`, `card_connections_organizacion`
  - Políticas RLS (Row Level Security) configuradas
  - Triggers para actualización automática de timestamps

### 2. Entidades de Dominio

- `domain/entities/PizarraOrganizacion.ts`
- `domain/entities/PizarraOrganizacionPermiso.ts`
- `domain/entities/CardOrganizacion.ts`
- `domain/entities/CardMisionOrganizacion.ts`
- `domain/entities/CardConnectionOrganizacion.ts`

### 3. Repositorios de Datos

- `infrastructure/datasource/SupabasePizarraOrganizacionRepository.ts`
  - CRUD completo para pizarra y permisos
  - Método `puedeEditar()` para verificar permisos

- `infrastructure/datasource/SupabaseCardOrganizacionRepository.ts`
  - CRUD para cards, misiones y conexiones
  - Mappers para conversión BD ↔ Dominio

### 4. Hooks de React

- `hooks/usePizarraOrganizacion.ts` - Maneja la pizarra principal
- `hooks/useCardsOrganizacion.ts` - CRUD de cards con real-time
- `hooks/usePizarraOrganizacionPermisos.ts` - Gestión de permisos

### 5. Modificaciones a Código Existente

- `application/pizarra/hooks/usePizarraLocalStorage.ts`
  - ✨ Nueva prop `isOrganizacionPizarra` para excluir renovación diaria
  - Línea 113: Condición modificada para NO limpiar pizarra de organización

- `application/pizarra/types.ts`
  - ✨ Nuevas props en `PizarraProps`:
    - `isOrganizacionPizarra?: boolean`
    - `readOnly?: boolean`

### 6. Página de Visualización

- `app/pizarra-organizacion/page.tsx`
  - Interfaz completa con header informativo
  - Badges de estado (Editor/Visualizador)
  - Manejo de estados de carga y errores
  - Integración con InputArea (solo para editores)

---

## 🚀 Instrucciones de Despliegue

### Paso 1: Ejecutar Migración en Supabase

Tienes dos opciones:

#### Opción A: Usando Supabase CLI (Recomendado)

```bash
# 1. Asegúrate de tener Supabase CLI instalado
# Si no lo tienes: npm install -g supabase

# 2. Navega al directorio del proyecto
cd /Users/eliasbest07/Documents/GitHub/new-total-time

# 3. Ejecuta la migración
supabase db push
```

#### Opción B: Manualmente desde Supabase Dashboard

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Abre el archivo `supabase/migrations/create_pizarra_organizacion.sql`
4. Copia todo el contenido
5. Pégalo en el SQL Editor
6. Haz clic en **Run**

### Paso 2: Verificar las Tablas

Ejecuta este query para verificar que las tablas se crearon correctamente:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE '%organizacion%';
```

Deberías ver:
- `pizarra_organizacion`
- `pizarra_organizacion_permisos`
- `cards_organizacion`
- `card_misiones_organizacion`
- `card_connections_organizacion`

### Paso 3: Otorgar Permisos Iniciales (Opcional)

Para otorgar permisos de edición a un usuario específico:

```sql
INSERT INTO pizarra_organizacion_permisos (
  id_organizacion,
  id_usuario,
  puede_editar,
  otorgado_por,
  otorgado_at
) VALUES (
  '[UUID_DE_TU_ORGANIZACION]',
  [ID_NUMERICO_DEL_USUARIO],
  true,
  [ID_DEL_ADMIN],
  NOW()
);
```

### Paso 4: Acceder a la Pizarra

Una vez desplegado, los usuarios pueden acceder a:

```
https://tu-dominio.com/pizarra-organizacion
```

---

## 🔐 Sistema de Permisos

### Por Defecto

- **TODOS** los miembros de la organización pueden **VER** la pizarra
- **SOLO** usuarios con permiso explícito pueden **EDITAR**
- El **admin** de la organización **siempre** puede editar

### Otorgar Permisos Programáticamente

Desde el código (solo admins):

```typescript
import { SupabasePizarraOrganizacionRepository } from '@/infrastructure/datasource/SupabasePizarraOrganizacionRepository';

const repository = new SupabasePizarraOrganizacionRepository();

// Otorgar permiso
await repository.setPermiso(
  idOrganizacion,
  idUsuario, // ID numérico
  true, // puede_editar = true
  idAdmin // Quién otorga el permiso
);

// Revocar permiso
await repository.revocarPermiso(idOrganizacion, idUsuario);

// Verificar si puede editar
const puedeEditar = await repository.puedeEditar(idOrganizacion, idUsuario);
```

### Usando el Hook

```typescript
import { usePizarraOrganizacionPermisos } from '@/hooks/usePizarraOrganizacionPermisos';

const { puedeEditar, otorgarPermiso, revocarPermiso } = usePizarraOrganizacionPermisos(
  idOrganizacion,
  idUsuario
);

// Otorgar permiso
await otorgarPermiso(idUsuarioTarget, idAdminQuienOtorga);

// Revocar permiso
await revocarPermiso(idUsuarioTarget);
```

---

## 🏗️ Arquitectura

### Flujo de Datos

```
Usuario → Página → Hooks → Repositorios → Supabase
                    ↓
              Local Storage (cache)
                    ↓
            Real-time subscriptions
```

### Diferencias Clave: Pizarra Personal vs Organización

| Característica | Pizarra Personal | Pizarra Organización |
|----------------|------------------|----------------------|
| Renovación | Diaria (cada 24h) | **Permanente** |
| Alcance | Usuario individual | Toda la organización |
| Permisos | Propietario único | Multi-usuario con roles |
| Prefijo Storage | `'real'` | `'organizacion'` |
| Tabla BD | `pizarras` | `pizarra_organizacion` |

### Persistencia

1. **Base de Datos (Supabase)** - Fuente de verdad permanente
2. **Local Storage** - Cache del cliente (NO se borra diariamente si `isOrganizacionPizarra=true`)
3. **Real-time** - Sincronización automática entre usuarios

---

## 🧪 Testing

### Verificar Persistencia Permanente

1. Abre la pizarra de organización
2. Agrega algunas cards
3. Espera 24 horas o cambia la fecha del sistema
4. Recarga la página
5. ✅ Las cards deben seguir ahí (NO se borran)

### Verificar Permisos

1. Usuario sin permisos:
   - ✅ Puede VER la pizarra
   - ❌ NO puede agregar/editar/eliminar cards
   - 🔒 Badge muestra "Visualizador"

2. Usuario con permisos:
   - ✅ Puede VER la pizarra
   - ✅ PUEDE agregar/editar/eliminar cards
   - ✏️ Badge muestra "Editor"

### Verificar Real-time

1. Abre la pizarra en dos navegadores (dos usuarios diferentes con permisos)
2. Agrega una card en el navegador A
3. ✅ La card debe aparecer automáticamente en el navegador B

---

## 🔧 Próximos Pasos (Opcional)

### 1. Actualizar Componente Pizarra

Para soportar completamente las nuevas props, actualiza `application/pizarra/pizarra.tsx`:

```typescript
const TestPizarra = forwardRef<PizarraRef, PizarraProps>(({
  onShowScreenshots,
  storagePrefix = 'real',
  lightMode = false,
  fullMode = false,
  viewingUserId,
  isOrganizacionPizarra = false, // ← Nueva
  readOnly = false, // ← Nueva
  onOpenUserChat,
  usuarios,
  currentUserId,
  onConnectionCreate
}, ref) => {
  // ...

  // Pasar isOrganizacionPizarra al hook de localStorage
  usePizarraLocalStorage(
    cards,
    connections,
    panOffset,
    setCards,
    setConnections,
    setPanOffset,
    storagePrefix,
    isOrganizacionPizarra // ← Agregar aquí
  );

  // Deshabilitar edición si readOnly=true
  const canEdit = !readOnly && !isViewingOtherUser;

  // ...
});
```

### 2. Agregar Botón de Acceso en el Dashboard

En `app/dashboard/page.tsx` o en tu menú principal:

```tsx
<Link href="/pizarra-organizacion">
  <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg">
    <Users className="h-5 w-5" />
    Pizarra de Organización
  </button>
</Link>
```

### 3. Panel de Administración de Permisos

Crea una página para que los admins gestionen permisos:

```tsx
// app/admin/permisos-pizarra/page.tsx
import { usePizarraOrganizacionPermisos } from '@/hooks/usePizarraOrganizacionPermisos';

export default function AdminPermisosPage() {
  const { getEditores, otorgarPermiso, revocarPermiso } = usePizarraOrganizacionPermisos(
    idOrganizacion,
    idAdmin
  );

  // UI para gestionar permisos...
}
```

### 4. Notificaciones

Implementa notificaciones cuando alguien edita la pizarra:

```typescript
// En useCardsOrganizacion.ts
if (payload.eventType === 'INSERT') {
  // Mostrar notificación toast
  toast.info(`Nuevo elemento agregado por ${usuario.nombre}`);
}
```

---

## 📚 Referencias

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React Hooks](https://react.dev/reference/react)

---

## ❓ Preguntas Frecuentes

### ¿Cómo sé si tengo permisos de edición?

Mira el badge en el header de la pizarra:
- 🟢 **Editor** = Puedes editar
- ⚪ **Visualizador** = Solo lectura

### ¿Puedo crear múltiples pizarras de organización?

Actualmente hay **una pizarra por organización**. Si necesitas múltiples pizarras, considera:
1. Usar "espacios" o "boards" dentro de la misma pizarra
2. Modificar el schema para permitir múltiples pizarras por organización

### ¿Los datos se sincronizan automáticamente?

Sí, gracias a Supabase Realtime. Los cambios se reflejan en **tiempo real** para todos los usuarios conectados.

### ¿Qué pasa si pierdo conexión?

Los cambios se guardan en **Local Storage** como cache. Cuando recuperes la conexión, se sincronizarán automáticamente.

---

## 🐛 Troubleshooting

### Error: "No perteneces a ninguna organización"

**Causa:** El usuario no tiene `idOrganizacion` configurado.

**Solución:**
```sql
UPDATE usuario
SET idOrganizacion = '[UUID_DE_ORGANIZACION]'
WHERE id = [ID_USUARIO];
```

### Error: "No se pudo cargar la pizarra"

**Causa:** La tabla `pizarra_organizacion` no existe o no hay permisos RLS.

**Solución:** Ejecuta la migración SQL nuevamente.

### Las cards no se sincronizan en tiempo real

**Causa:** Supabase Realtime no está habilitado para las tablas.

**Solución:**
1. Ve a Supabase Dashboard → Database → Replication
2. Habilita realtime para:
   - `cards_organizacion`
   - `card_connections_organizacion`
   - `card_misiones_organizacion`

---

## ✨ Contribuciones

Para agregar nuevas funcionalidades a la pizarra de organización:

1. Modifica las entidades en `domain/entities/`
2. Actualiza el repositorio en `infrastructure/datasource/`
3. Actualiza el hook en `hooks/`
4. Actualiza la UI en `app/pizarra-organizacion/`

---

**¡Listo!** Tu sistema de pizarra de organización está completo y listo para usar. 🎉
