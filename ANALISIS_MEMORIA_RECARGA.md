# 🔍 Análisis: Aumento de Memoria al Recargar

## 🤔 Posibles Causas

### 1. **Event Listeners No Limpiados**
Los event listeners del DOM (click, resize, mousemove, etc.) pueden acumularse si no se limpian correctamente.

**Dónde buscar:**
- Componentes con `addEventListener` en `useEffect`
- Drag & drop handlers
- Resize handlers
- Mouse/touch events en la Pizarra

### 2. **Suscripciones de Supabase Duplicadas**
Aunque verificamos que tienen cleanup, puede haber casos donde se crean múltiples suscripciones.

**Problema común:**
```typescript
// ❌ MALO - Crea nueva suscripción en cada render
const channel = supabase.channel(`canal-${userId}`).subscribe()

// ✅ BUENO - Solo una suscripción por cambio de userId
useEffect(() => {
  const channel = supabase.channel(`canal-${userId}`).subscribe()
  return () => supabase.removeChannel(channel)
}, [userId])
```

### 3. **localStorage Grande**
El contenido de localStorage se carga en memoria al inicio.

**Verifica:**
```javascript
// En la consola del navegador
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    total += localStorage[key].length;
  }
}
console.log('localStorage total:', (total / 1024).toFixed(2), 'KB');
```

### 4. **Imágenes/Canvas en Pizarra**
Las imágenes, screenshots y canvas pueden ocupar mucha memoria.

**Cada canvas/imagen:**
- Canvas 1920x1080: ~8 MB en memoria
- Imagen PNG grande: 2-5 MB
- Si tienes 5 cards con imágenes: 10-25 MB

### 5. **State No Limpiado en Contextos**
Los contextos (AuthContext, ChatWindowContext, etc.) mantienen datos en memoria.

### 6. **Componentes Montados Múltiples Veces**
React en modo desarrollo monta componentes 2 veces (Strict Mode).

## 🔬 Cómo Diagnosticar

### Paso 1: Verificar si es Normal

1. Abre el monitor de memoria (esquina inferior derecha)
2. Anota la memoria inicial: _____ MB
3. Recarga la página (F5)
4. Espera 10 segundos
5. Anota la memoria después de recargar: _____ MB
6. Usa la app por 1 minuto
7. Anota la memoria después de usar: _____ MB

**Interpretación:**
- **Normal:** Sube 20-50 MB al cargar, luego se estabiliza
- **Problema leve:** Sube 50-100 MB, se estabiliza
- **Problema grave:** Sube >100 MB y sigue subiendo

### Paso 2: Identificar la Fuente

En la consola, ejecuta:

```javascript
// Ver tamaño de localStorage
let lsSize = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    lsSize += localStorage[key].length;
    console.log(key, ':', (localStorage[key].length / 1024).toFixed(2), 'KB');
  }
}
console.log('📦 Total localStorage:', (lsSize / 1024).toFixed(2), 'KB');

// Ver canales de Supabase activos
window.__performanceUtils.analyzePerformance();

// Contar elementos del DOM
console.log('🌳 Nodos DOM:', document.getElementsByTagName('*').length);
```

### Paso 3: Profiling en Chrome DevTools

1. Abre DevTools (F12) → **Memory**
2. **Toma Heap Snapshot #1** (antes de recargar)
3. Anota memoria: _____ MB
4. **Recarga la página** (F5)
5. Espera que cargue completamente
6. **Toma Heap Snapshot #2** (después de recargar)
7. Anota memoria: _____ MB
8. Click en **Comparison** (comparación)
9. Mira qué objetos aumentaron:
   - **Detached DOM nodes** → Memory leak
   - **Arrays grandes** → Posible acumulación de datos
   - **Closures** → Event listeners no limpiados
   - **Strings** → localStorage muy grande

## 🛠️ Soluciones Comunes

### Solución 1: Verificar Strict Mode

En `app/layout.tsx`, React.StrictMode monta componentes 2 veces en desarrollo.

**Esto es NORMAL en desarrollo**, pero duplica suscripciones temporalmente.

Para probar sin Strict Mode (solo para debug):
```typescript
// Temporalmente comenta StrictMode
// <React.StrictMode>
  <AuthProvider>
    {/* ... */}
  </AuthProvider>
// </React.StrictMode>
```

### Solución 2: Limpiar localStorage Periódicamente

Ya tienes limpieza diaria en `usePizarraLocalStorage.ts`, pero puedes verificar el tamaño:

```typescript
// Agregar al inicio de usePizarraLocalStorage
useEffect(() => {
  const checkLocalStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length;
      }
    }
    const sizeMB = (total / 1048576).toFixed(2);

    if (parseFloat(sizeMB) > 5) {
      console.warn('⚠️ localStorage muy grande:', sizeMB, 'MB');
      // Limpiar datos antiguos o innecesarios
    }
  };

  checkLocalStorageSize();
}, []);
```

### Solución 3: Limitar Mensajes en Chat

En `useChatMessages.ts`, ya carga todos los mensajes. Limita a los últimos 50:

```typescript
// En setMensajes, agregar slice
setMensajes(prev => {
  const updated = [...prev, nuevoMensaje];
  return updated.slice(-50); // Solo últimos 50 mensajes
});
```

### Solución 4: Lazy Load de Componentes Pesados

```typescript
import { lazy, Suspense } from 'react';

const ChatWindow = lazy(() => import('./ChatWindow'));
const ProyectoWindow = lazy(() => import('./ProyectoWindow'));

// En el render:
<Suspense fallback={<div>Cargando...</div>}>
  {showChatWindow && <ChatWindow />}
</Suspense>
```

### Solución 5: Limpiar Canales de Supabase Globalmente

Crear una utilidad para rastrear canales:

```typescript
// utils/supabaseChannelManager.ts
const activeChannels = new Set<string>();

export const trackChannel = (channelName: string) => {
  activeChannels.add(channelName);
  console.log('📡 Canales activos:', activeChannels.size);
};

export const untrackChannel = (channelName: string) => {
  activeChannels.delete(channelName);
  console.log('📡 Canales activos:', activeChannels.size);
};

export const getActiveChannels = () => activeChannels;
```

## 📊 Benchmarks Esperados

### Memoria Normal (sin problemas):

| Estado | Memoria Esperada |
|--------|------------------|
| Página vacía | 30-50 MB |
| Después de login | 60-100 MB |
| Con 5 cards en pizarra | 80-120 MB |
| Con 3 chats abiertos | 100-150 MB |
| Después de 30 min uso | 120-180 MB |

### Señales de Alerta:

- ⚠️ Memoria > 300 MB
- ⚠️ Memoria aumenta 10+ MB por minuto
- ⚠️ Recarga aumenta 100+ MB
- 🚨 Memoria > 500 MB
- 🚨 Browser se vuelve lento

## 🎯 Plan de Acción

### Paso 1: Medición (Haz esto AHORA)
```javascript
// Copia y pega en la consola:
console.group('📊 Diagnóstico Inicial');
window.__performanceUtils.logMemoryInfo('Memoria Actual');
console.log('🌳 Nodos DOM:', document.getElementsByTagName('*').length);

let lsSize = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    lsSize += localStorage[key].length;
  }
}
console.log('💾 localStorage:', (lsSize / 1024).toFixed(2), 'KB');
console.groupEnd();
```

### Paso 2: Recargar y Medir
1. Toma nota de los valores
2. Recarga (F5)
3. Ejecuta el mismo código
4. Compara los valores

### Paso 3: Reportar Resultados
Comparte conmigo:
- Memoria antes de recargar: _____
- Memoria después de recargar: _____
- Diferencia: _____
- Tamaño localStorage: _____
- Nodos DOM: _____

Con estos datos puedo darte una solución específica.

## 🔍 Investigación Adicional

Si el problema persiste, revisa estos archivos:

1. **Pizarra:** `application/pizarra/pizarra.tsx`
   - Busca `addEventListener` sin `removeEventListener`
   - Verifica cleanup de canvas

2. **Hooks de Supabase:**
   - `useIncomingMessages.ts`
   - `useChatMessages.ts`
   - `usePresence.ts`
   - Asegura que todos tengan `return () => cleanup()`

3. **Contextos:**
   - `AuthContext.tsx`
   - `ChatWindowContext.tsx`
   - Verifica que no acumulen datos infinitamente

---

**Siguiente paso:** Ejecuta el diagnóstico del Paso 1 y comparte los resultados.
