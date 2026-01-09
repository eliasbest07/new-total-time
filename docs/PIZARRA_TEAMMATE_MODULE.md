# Módulo: Visualización de Pizarra de Compañeros

## Descripción General

Este módulo permite a los usuarios visualizar y agregar elementos a las pizarras de sus compañeros de equipo. Cuando un usuario accede a la pizarra de otro mediante `/pizarra/[userId]`, puede ver su contenido y agregar notas, listas, misiones, actividades, recursos e imágenes (con los permisos adecuados).

## Historial de Desarrollo

### Commit: `c437d72` - feat: agregar misiones, actividades, todos, recursos y notas a pizarras de otros usuarios

**Fecha**: 5 de enero de 2026
**Autor**: gitsusdav

**Cambios principales:**

1. **Panel de Agregar Elementos**: Se agregó un panel flotante con 3 tabs (Misiones, Actividades, Recursos) que permite agregar contenido del usuario cuya pizarra se visualiza.

2. **Nuevos Hooks Integrados**:
   - `useMisiones(userNumericId)`: Carga las misiones del usuario dueño de la pizarra
   - `useActividades(userId)`: Carga las actividades del usuario
   - Carga dinámica de recursos desde `SupabaseRecursoRepository`

3. **Sistema de Permisos**: Integración completa con `usePizarraPermissions` para controlar acceso de edición.

4. **Funciones de Agregar Cards**:
   - `handleAddMision()`: Agrega misiones usando `pizarraRef.current.addMisionCard()`
   - `handleAddActividad()`: Agrega actividades usando `pizarraRef.current.restoreCard()`
   - `handleAddRecurso()`: Agrega recursos usando `pizarraRef.current.restoreCard()`

5. **Modo ReadOnly Propagado**: El prop `readOnly` se propaga correctamente a través de:
   - `page.tsx` → `Pizarra` → `CardWrapper` → `CardFactory` → Cards específicas

6. **UI/UX Mejorado**:
   - Botón "Agregar" con dropdown para mostrar el panel
   - Paginación de recursos (5 por página)
   - Indicadores visuales de estado (solo lectura, permiso pendiente, etc.)
   - InputArea siempre visible cuando se tiene permiso de edición

**Archivos modificados** (526 líneas agregadas, 209 eliminadas):
- `app/pizarra/[userId]/page.tsx` (cambio principal)
- `application/pizarra/components/CardFactory.tsx`
- `application/pizarra/components/CardWrapper.tsx`
- `application/pizarra/components/cards/MisionCard.tsx`
- `application/pizarra/pizarra.tsx`
- `docs/PIZARRA_TEAMMATE_MODULE.md` (este archivo)

## Rutas

- **`/pizarra/[userId]`** - Página dinámica que muestra la pizarra de un compañero específico

## Archivos Principales

### Páginas

| Archivo | Descripción |
|---------|-------------|
| `app/pizarra/[userId]/page.tsx` | Página principal para ver pizarras ajenas |

### Componentes Core

| Archivo | Descripción |
|---------|-------------|
| `application/pizarra/pizarra.tsx` | Componente principal de pizarra (3100+ líneas) |
| `application/pizarra/components/CardFactory.tsx` | Factory pattern para renderizar diferentes tipos de cards |
| `application/pizarra/components/CardWrapper.tsx` | Wrapper que envuelve cada card con estilos y funcionalidades comunes |
| `application/pizarra/components/cards/MisionCard.tsx` | Card para mostrar misiones |
| `application/pizarra/components/cards/RecursoCard.tsx` | Card para mostrar recursos |

### Hooks Utilizados

| Hook | Descripción |
|------|-------------|
| `useMisiones(userId)` | Obtiene las misiones de un usuario |
| `useActividades(userId)` | Obtiene las actividades de un usuario |
| `useChatMessages(currentUserId, targetUserId)` | Obtiene mensajes del chat |

### Repositorios de Datos

| Repositorio | Descripción |
|-------------|-------------|
| `SupabaseRecursoRepository` | CRUD de recursos en Supabase |
| `SupabasePizarraRepository` | CRUD de pizarras en Supabase |
| `SupabaseCardRepository` | CRUD de cards en Supabase |

## Funcionalidades

### 1. Visualización de Pizarra Ajena

```typescript
// En app/pizarra/[userId]/page.tsx
const { userId } = useParams();
const isViewingOtherUser = !!viewingUserId && viewingUserId !== usuario?.userAuth;
```

### 2. Panel de Agregar Elementos

El panel ubicado en la esquina superior izquierda permite agregar:

- **Misiones** (tab verde) - Misiones del usuario cuya pizarra se visualiza
- **Actividades** (tab azul) - Actividades del usuario
- **Recursos** (tab naranja) - Recursos del usuario (con paginación de 5 elementos)

```typescript
// Estados del panel
const [showAddPanel, setShowAddPanel] = useState(false);
const [activeTab, setActiveTab] = useState<'misiones' | 'actividades' | 'recursos'>('misiones');
const [recursosPage, setRecursosPage] = useState(0);
const RECURSOS_PER_PAGE = 5;
```

### 3. Funciones para Agregar Cards

```typescript
// Agregar misión
const handleAddMision = (mision: any) => {
  pizarraRef.current?.addMisionCard({
    id_mision: mision.id,
    title: mision.nombre || 'Sin nombre',
    description: mision.descripcion || '',
    hours: mision.horas || 0,
    id_usuario: mision.id_usuario,
    id_creador: mision.id_creador
  });
};

// Agregar recurso
const handleAddRecurso = (recurso: Recurso) => {
  pizarraRef.current?.restoreCard({
    id: `recurso-${recurso.id}-${Date.now()}`,
    type: 'resource',
    title: recurso.nombre || 'Recurso',
    content: recurso.link || '',
    // ... más propiedades
    recursoData: {
      id: recurso.id,
      name: recurso.nombre || 'Recurso',
      resourceType: 'link',
      url: recurso.link,
      icon: recurso.icono,
      color: 'bg-orange-500'
    }
  });
};
```

### 4. Modo ReadOnly para Pizarras Ajenas

Cuando se visualiza la pizarra de otro usuario, ciertas funcionalidades se deshabilitan:

- **Botón play/pause en MisionCard**: Oculto cuando `readOnly={true}`

```typescript
// En MisionCard.tsx
interface MisionCardProps {
  readOnly?: boolean; // Si es true, oculta botones de play/pause
}

// Propagación del prop
// pizarra.tsx -> CardWrapperComponent -> CardFactory -> MisionCard
readOnly={readOnly || isViewingOtherUser}
```

## Flujo de Props: readOnly

```
pizarra.tsx
    └── readOnly={readOnly || isViewingOtherUser}
         │
         ▼
    CardWrapperComponent (CardWrapper.tsx)
         └── readOnly?: boolean
              │
              ▼
         CardFactory (CardFactory.tsx)
              └── readOnly?: boolean
                   │
                   ▼
              MisionCard (MisionCard.tsx)
                   └── {!readOnly && <PlayButton />}
```

## Tipos Principales

### PizarraRef (tipos exportados desde pizarra.tsx)

```typescript
interface PizarraRef {
  addMisionCard: (misionData: any) => string | void;
  restoreCard: (card: Card) => void;
  addTodoCard: (text?: string) => string;
  addNoteCard: (text: string, position?: { x: number; y: number }) => string;
  // ... más métodos
}
```

### Card Types

- `text` - Notas de texto
- `todo` - Listas de tareas
- `mision` - Misiones personales
- `mision-organizacion` - Misiones de organización
- `actividad` - Actividades
- `actividad-organizacion` - Actividades de organización
- `proyecto` - Proyectos
- `proyecto-organizacion` - Proyectos de organización
- `resource` - Recursos (links, documentos)
- `image` - Imágenes
- `usuario` - Cards de usuario

## Navegación

### Acceder desde ChatWindow

En `app/components/ChatWindow.tsx`, hay un botón que navega a la pizarra del usuario:

```typescript
<button
  onClick={() => router.push(`/pizarra/${targetUser.userId}`)}
  title="Pizarra"
>
  <LayoutGrid />
</button>
```

## Consideraciones de Desarrollo

1. **InputArea siempre visible**: El área de input se muestra siempre que se visualiza una pizarra ajena, permitiendo agregar notas y listas.

2. **Paginación de recursos**: Limitado a 5 recursos por página para mejor UX.

3. **Sincronización con Supabase**: Las cards agregadas se sincronizan automáticamente con la base de datos.

4. **ID numérico vs UUID**:
   - Para hooks de misiones/actividades se usa el ID numérico del usuario
   - Para la pizarra se usa el UUID (userAuth)

### 5. Pegado de Imágenes desde Portapapeles

Los usuarios con permiso de edición pueden pegar imágenes directamente desde el portapapeles utilizando `Ctrl+V` (o `Cmd+V` en Mac).

**Funcionamiento:**

1. El hook `usePasteImage` escucha el evento `paste` del documento
2. Cuando detecta una imagen:
   - Crea una URL temporal del blob
   - Genera una card de tipo 'image' centrada en la vista actual
   - Sube la imagen a Supabase Storage (`imagenes_pizarra` bucket)
   - Actualiza la card con la URL pública de Supabase
   - Limpia la URL temporal para prevenir memory leaks

**Permisos:**
- ✅ Habilitado: Pizarra propia o con permiso de edición (`canEdit = true`)
- ❌ Deshabilitado: Modo solo lectura (`readOnly = true`)

```typescript
// En pizarra.tsx (línea 439)
// El prop readOnly ya tiene en cuenta si puede editar o no (incluyendo permisos)
usePasteImage(
  cards,
  setCards,
  panOffset,
  canvasRef,
  setPastedImages,
  readOnly
);
```

**Características:**
- Las imágenes se centran automáticamente en la vista actual del usuario
- Se ignora el paste si el usuario está escribiendo en un input o textarea
- Las imágenes se almacenan permanentemente en Supabase Storage
- Cada card de imagen tiene un z-index superior a todas las cards existentes

### 6. Sistema de Permisos

El módulo implementa un sistema de permisos para controlar quién puede editar pizarras ajenas.

**Estados de permiso:**
- **Sin permiso**: Modo solo lectura, solo visualización
- **Permiso pendiente**: Solicitud enviada, esperando aprobación del dueño
- **Permiso otorgado**: Acceso completo de edición (agregar notas, tareas, imágenes, etc.)

**Componente de gestión:**
```typescript
const {
  hasPermission,      // boolean: si tiene permiso otorgado
  isPending,          // boolean: si tiene solicitud pendiente
  loading,            // boolean: estado de carga
  requestPermission   // function: enviar solicitud de permiso
} = usePizarraPermissions(userNumericId, currentUserNumericId);
```

**Flujo de permisos:**

1. Usuario accede a pizarra ajena → `canEdit = false`, `isReadOnly = true`
2. Usuario solicita permiso → `isPending = true`, botón muestra "Solicitud pendiente"
3. Dueño aprueba/rechaza desde `<PizarraPermissionRequests />` en su pizarra
4. Si aprueba → `hasPermission = true`, `canEdit = true`, `isReadOnly = false`
5. Usuario puede editar normalmente (agregar elementos, pegar imágenes, crear notas)

**UI de permisos:**

```typescript
// Botón de solicitar permiso (cuando no tiene permiso)
<button onClick={requestPermission}>
  <Send /> Solicitar permiso de edición
</button>

// Indicador de pendiente
<div className="bg-yellow-500">
  <Clock /> Solicitud pendiente
</div>

// Indicador de solo lectura
<div className="bg-white/10">
  <Lock /> Solo lectura
</div>
```

## Bugs Corregidos

### Bug: Pegado de imágenes bloqueado con permisos de edición (9 de enero de 2026)

**Problema**: Los usuarios con permiso de edición en pizarras ajenas no podían pegar imágenes, aunque el resto de funciones de edición funcionaban correctamente.

**Causa raíz**: En `pizarra.tsx` línea 439, se pasaba `readOnly || isViewingOtherUser` al hook `usePasteImage`:

```typescript
// ❌ CÓDIGO CON BUG
usePasteImage(cards, setCards, panOffset, canvasRef, setPastedImages, readOnly || isViewingOtherUser);
```

El problema es que `isViewingOtherUser` siempre es `true` cuando estás en la pizarra de otro usuario, por lo que la condición `readOnly || isViewingOtherUser` siempre evaluaba a `true`, bloqueando el pegado incluso con permisos de edición.

**Solución**: El prop `readOnly` ya considera correctamente los permisos (se calcula como `!canEdit` en `page.tsx`), por lo que solo necesitamos pasar `readOnly`:

```typescript
// ✅ CÓDIGO CORREGIDO
usePasteImage(cards, setCards, panOffset, canvasRef, setPastedImages, readOnly);
```

**Archivos modificados**:
- `application/pizarra/pizarra.tsx:439`
- `application/pizarra/hooks/usePasteImage.ts` (logs de depuración temporales removidos)

## Próximas Mejoras Posibles

- [ ] Agregar notificaciones al dueño de la pizarra cuando alguien agrega elementos
- [ ] Implementar permisos granulares (quién puede agregar qué tipo de contenido)
- [ ] Agregar historial de cambios con autor y timestamp
- [ ] Permitir comentarios en cards de pizarras ajenas
- [ ] Implementar modo colaborativo en tiempo real con cursores de múltiples usuarios
