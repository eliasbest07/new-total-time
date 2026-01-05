# Módulo: Visualización de Pizarra de Compañeros

## Descripción General

Este módulo permite a los usuarios visualizar y agregar elementos a las pizarras de sus compañeros de equipo. Cuando un usuario accede a la pizarra de otro mediante `/pizarra/[userId]`, puede ver su contenido y agregar notas, listas, misiones, actividades y recursos.

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

## Próximas Mejoras Posibles

- [ ] Añadir indicador visual cuando se está en modo readOnly
- [ ] Agregar notificaciones al dueño de la pizarra cuando alguien agrega elementos
- [ ] Implementar permisos granulares (quién puede agregar qué)
- [ ] Agregar historial de cambios en pizarra ajena
