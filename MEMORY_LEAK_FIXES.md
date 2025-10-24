# Memory Leak Fixes - Soluciones Detalladas

## Problema Principal
Cada vez que refrescas la página, se agregan ~10MB de RAM que no se liberan. Esto se debe principalmente a:

1. Canales de Supabase Realtime que no se limpian correctamente
2. Múltiples suscripciones duplicadas
3. Canvas y blobs que se acumulan
4. Console.logs que mantienen referencias

---

## Solución 1: Arreglar useIncomingMessages.ts

### Problema Actual (líneas 21-200):
```typescript
export const useIncomingMessages = (
  userId?: string | null,
  options?: UseIncomingMessagesOptions
) => {
  // ...
  useEffect(() => {
    // ...suscripción...
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, options, chatWindowsContext]); // ❌ PROBLEMA: options y chatWindowsContext cambian cada render
};
```

### Solución:
```typescript
export const useIncomingMessages = (
  userId?: string | null,
  options?: UseIncomingMessagesOptions
) => {
  const { usuario } = useAuth();
  const chatWindowsContext = useChatWindows();

  // ✅ SOLUCIÓN: Usar useRef para mantener estable el callback
  const onNewMessageRef = useRef(options?.onNewMessage);

  useEffect(() => {
    onNewMessageRef.current = options?.onNewMessage;
  }, [options?.onNewMessage]);

  const currentUserId = userId || usuario?.userAuth;

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`incoming-messages-${currentUserId}`) // ✅ Nombre único por usuario
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `id_receptor=eq.${currentUserId}`
        },
        async (payload) => {
          // ...lógica...

          // ✅ Usar el ref en lugar de options directamente
          if (onNewMessageRef.current) {
            onNewMessageRef.current(userData);
          } else if (chatWindowsContext?.openChatWindow) {
            chatWindowsContext.openChatWindow(userData);
          }
        }
      )
      .subscribe();

    return () => {
      // ✅ Cleanup mejorado
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [currentUserId]); // ✅ Solo currentUserId como dependencia
};
```

---

## Solución 2: Arreglar useChatMessages.ts

### Problema Actual (líneas 137-192):
```typescript
const channel = supabase
  .channel('mensajes-changes') // ❌ PROBLEMA: Mismo nombre para todos los chats
  .on(...)
  .subscribe();
```

### Solución:
```typescript
// ✅ Nombre único por conversación
const idConversacion = Mensaje.generarIdConversacion(currentUserId, otherUserId);

const channel = supabase
  .channel(`chat-${idConversacion}`) // ✅ Nombre único
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'mensajes',
      filter: `id_conversacion=eq.${idConversacion}`
    },
    (payload) => {
      // ...lógica...
    }
  )
  .subscribe();

return () => {
  // ✅ Cleanup mejorado
  channel.unsubscribe();
  supabase.removeChannel(channel);
};
```

---

## Solución 3: Arreglar usePresence.ts

### Problema Actual (líneas 101):
```typescript
}, [organizationId, currentUser?.id, currentUser?.username, currentUser?.avatar]);
// ❌ PROBLEMA: Múltiples dependencias que pueden cambiar
```

### Solución:
```typescript
// ✅ Usar useMemo para estabilizar el objeto currentUser
const stableCurrentUser = useMemo(() =>
  currentUser ? {
    id: currentUser.id,
    username: currentUser.username,
    avatar: currentUser.avatar
  } : null,
  [currentUser?.id, currentUser?.username, currentUser?.avatar]
);

useEffect(() => {
  if (!organizationId || !stableCurrentUser) return;

  const channel = supabase.channel(`presence-org-${organizationId}`, {
    config: {
      presence: {
        key: stableCurrentUser.id,
      },
    },
  });

  // ...resto del código...

  return () => {
    if (channelRef.current) {
      channelRef.current.untrack();
      channelRef.current.unsubscribe();
      // ✅ Agregar removeChannel
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
}, [organizationId, stableCurrentUser]); // ✅ Usar stableCurrentUser
```

---

## Solución 4: Arreglar useScreenshots.ts

### Problema: Canvas y Blobs no se limpian

### Solución:
```typescript
// En la función donde creas el canvas (líneas 155 y 327)
try {
  const canvas = document.createElement("canvas");
  // ...código de captura...

  // ✅ AGREGAR: Limpiar canvas explícitamente
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;

} catch (error) {
  console.error('Error:', error);
} finally {
  // ✅ Forzar limpieza
  canvas = null;
}
```

---

## Solución 5: Reducir Console.logs

### Buscar y eliminar/comentar todos los console.log en:
- `useIncomingMessages.ts` (líneas 32-34, 37, 44, 58, etc.)
- `useChatMessages.ts` (líneas 15, 18, 25, 29, etc.)
- `usePresence.ts` (líneas 35, 39, 55, 68, etc.)
- `MainScreen.tsx` (líneas 227, 236, etc.)

### Herramienta para buscar:
```bash
# Buscar todos los console.log no comentados
grep -r "console.log" --include="*.ts" --include="*.tsx" hooks/ app/
```

---

## Solución 6: Optimizar MainScreen.tsx

### Problema: useEffect con logs (líneas 226-244)

### Solución:
```typescript
// ✅ ELIMINAR o comentar estos useEffect de debug
// useEffect(() => {
//   console.log('📁 MainScreen - Estado proyectos:', ...);
// }, [proyectosSupabase, proyectosLoading]);

// useEffect(() => {
//   console.log('👥 MainScreen - Estado usuarios organización:', ...);
// }, [usuariosOrganizacion, usuariosLoading]);
```

---

## Solución 7: Crear un hook de limpieza global

Crea un nuevo archivo `hooks/useCleanup.ts`:

```typescript
import { useEffect, useRef } from 'react';

/**
 * Hook para asegurar limpieza de recursos al desmontar
 */
export const useCleanup = (cleanupFn: () => void) => {
  const cleanupRef = useRef(cleanupFn);

  useEffect(() => {
    cleanupRef.current = cleanupFn;
  }, [cleanupFn]);

  useEffect(() => {
    return () => {
      cleanupRef.current();
    };
  }, []);
};
```

---

## Verificación de Mejoras

### Antes de implementar:
1. Abrir Chrome DevTools > Performance > Memory
2. Tomar snapshot inicial
3. Refrescar página 5 veces
4. Tomar snapshot final
5. Ver el incremento de memoria (~50MB)

### Después de implementar:
1. Aplicar los fixes
2. Repetir el proceso
3. El incremento debería ser <5MB

---

## Prioridad de Implementación

1. **CRÍTICO**: useIncomingMessages (Solución 1)
2. **CRÍTICO**: useChatMessages (Solución 2)
3. **ALTO**: usePresence (Solución 3)
4. **MEDIO**: useScreenshots (Solución 4)
5. **BAJO**: Console.logs (Solución 5)
6. **BAJO**: MainScreen logs (Solución 6)

---

## Testing

Después de cada fix, verifica:
```typescript
// Agregar temporalmente en el componente principal
useEffect(() => {
  const interval = setInterval(() => {
    if (performance.memory) {
      console.log('Memoria usada:',
        (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB'
      );
    }
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

---

## Notas Adicionales

- Supabase mantiene canales activos por defecto hasta que se llama explícitamente a `removeChannel`
- Los canales con el mismo nombre se reutilizan, pero las suscripciones se acumulan
- React 19 tiene un garbage collector mejorado, pero aún requiere limpieza manual de recursos externos
