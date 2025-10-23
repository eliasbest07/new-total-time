# 🔴 Diagnóstico: Memory Leak de 10MB por Recarga

## ⚡ Acción Inmediata

Abre la consola del navegador y ejecuta:

```javascript
// 1. Ver canales de Supabase activos
window.__supabaseChannels.logStatus();

// 2. Ver memoria
window.__performanceUtils.logMemoryInfo();

// 3. Ver AMBOS juntos
console.group('🔍 DIAGNÓSTICO COMPLETO');
window.__supabaseChannels.logStatus();
window.__performanceUtils.logMemoryInfo();
console.groupEnd();
```

## 🎯 Test de Recarga

**Ejecuta este test:**

```javascript
// ANTES de recargar
console.group('📊 ANTES DE RECARGAR');
const antes = {
  memoria: performance.memory.usedJSHeapSize / 1048576,
  canales: window.__supabaseChannels.getCount(),
  dom: document.getElementsByTagName('*').length
};
console.log('Memoria (MB):', antes.memoria.toFixed(2));
console.log('Canales Supabase:', antes.canales);
console.log('Nodos DOM:', antes.dom);
console.groupEnd();

// Copia estos valores:
// Memoria: _____
// Canales: _____
// DOM: _____
```

Luego **RECARGA LA PÁGINA** (F5) y ejecuta:

```javascript
// DESPUÉS de recargar
console.group('📊 DESPUÉS DE RECARGAR');
const despues = {
  memoria: performance.memory.usedJSHeapSize / 1048576,
  canales: window.__supabaseChannels.getCount(),
  dom: document.getElementsByTagName('*').length
};
console.log('Memoria (MB):', despues.memoria.toFixed(2));
console.log('Canales Supabase:', despues.canales);
console.log('Nodos DOM:', despues.dom);
console.groupEnd();

// Los canales deberían ser similares (±2)
// Si los canales aumentan 5+ → Memory leak en Supabase
// Si DOM aumenta 1000+ → Memory leak en componentes
```

## 🐛 Causas Comunes de 10MB por Recarga

### 1. **React Strict Mode** (CAUSA MÁS PROBABLE)
En desarrollo, React monta componentes 2 veces, duplicando:
- Suscripciones de Supabase
- Event listeners
- Datos en estado

**Solución temporal para probar:**

En `app/layout.tsx`, comenta `<React.StrictMode>` si existe.

### 2. **Suscripciones de Supabase sin cleanup**

Verifica que TODOS los hooks tengan esto:

```typescript
useEffect(() => {
  const channel = supabase.channel('...').subscribe()

  return () => {
    supabase.removeChannel(channel) // ✅ ESTO ES CRÍTICO
  }
}, [deps])
```

### 3. **localStorage muy grande**

Ejecuta:
```javascript
let total = 0;
for (let k in localStorage) {
  if (localStorage.hasOwnProperty(k)) {
    total += localStorage[k].length;
  }
}
console.log('localStorage:', (total / 1048576).toFixed(2), 'MB');
```

Si es > 5 MB, ahí está parte del problema.

### 4. **Imágenes/Canvas no liberados**

Cada canvas puede ocupar 8 MB. Si tienes screenshots o imágenes:

```javascript
// Ver cuántos canvas hay
console.log('Canvas elements:', document.getElementsByTagName('canvas').length);

// Ver cuántas imágenes
console.log('Image elements:', document.getElementsByTagName('img').length);
```

### 5. **Closures capturando datos**

Event handlers o callbacks que capturan estado grande.

## 🔧 Soluciones Inmediatas

### Solución 1: Limpiar Canales Forzadamente

Si los canales no se limpian automáticamente:

```javascript
// Forzar limpieza de TODOS los canales
window.__supabaseChannels.forceCleanup();

// Luego verificar
window.__supabaseChannels.logStatus();
```

### Solución 2: Limitar Mensajes en Memoria

En `useChatMessages.ts`, limitar a 50 mensajes máximo:

```typescript
setMensajes(prev => {
  const updated = [...prev, nuevoMensaje];
  // Mantener solo últimos 50
  return updated.slice(-50);
});
```

### Solución 3: Limpiar localStorage al Inicio

En `usePizarraLocalStorage.ts`, agregar limpieza agresiva:

```typescript
useEffect(() => {
  // Limpiar datos viejos al montar
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('pizarra_') || key.startsWith('chat_')) {
      const data = localStorage.getItem(key);
      // Si el dato es muy grande (>1MB), eliminarlo
      if (data && data.length > 1048576) {
        console.warn('🗑️ Eliminando dato grande:', key, (data.length / 1024).toFixed(2), 'KB');
        localStorage.removeItem(key);
      }
    }
  });
}, []);
```

### Solución 4: Garbage Collection Manual

Después de cada recarga, forzar GC (solo en desarrollo):

```javascript
// En la consola (Chrome DevTools)
// 1. Abrir Performance Monitor (Shift+Cmd+P → "Performance Monitor")
// 2. Click en el icono de basura 🗑️ para forzar GC

// O ejecutar:
if (window.gc) window.gc();
```

## 📊 Checklist de Diagnóstico

Marca las que ya verificaste:

- [ ] Ejecuté `window.__supabaseChannels.logStatus()`
- [ ] Número de canales: _____
- [ ] Ejecuté test ANTES/DESPUÉS de recargar
- [ ] Memoria ANTES: _____ MB
- [ ] Memoria DESPUÉS: _____ MB
- [ ] Diferencia: _____ MB
- [ ] localStorage tamaño: _____ MB
- [ ] Número de canvas: _____
- [ ] Número de imágenes: _____
- [ ] Probé sin React Strict Mode: Sí / No

## 🎯 Plan de Acción Según Resultados

### Si los canales aumentan cada recarga:
→ Problema en hooks de Supabase
→ Revisar: `useIncomingMessages`, `useChatMessages`, `usePresence`, `useCards`, etc.

### Si localStorage > 5 MB:
→ Problema en almacenamiento local
→ Implementar limpieza agresiva

### Si canvas/imágenes > 5:
→ Problema en screenshots o pizarra
→ Liberar canvas después de usar

### Si nada de lo anterior:
→ Problema en React Strict Mode o closures
→ Deshabilitar Strict Mode temporalmente

## 🚀 Siguiente Paso

**Ejecuta este código completo y comparte los resultados:**

```javascript
console.group('🔍 REPORTE COMPLETO - COPIA ESTO');

// Memoria
const mem = performance.memory;
console.log('💾 Memoria:', (mem.usedJSHeapSize / 1048576).toFixed(2), 'MB');

// Canales
const canales = window.__supabaseChannels.getCount();
console.log('📡 Canales Supabase:', canales);
window.__supabaseChannels.logStatus();

// localStorage
let lsSize = 0;
for (let k in localStorage) {
  if (localStorage.hasOwnProperty(k)) {
    lsSize += localStorage[k].length;
  }
}
console.log('💾 localStorage:', (lsSize / 1048576).toFixed(2), 'MB');

// DOM
const nodes = document.getElementsByTagName('*').length;
console.log('🌳 Nodos DOM:', nodes);

// Canvas e imágenes
const canvas = document.getElementsByTagName('canvas').length;
const imgs = document.getElementsByTagName('img').length;
console.log('🖼️ Canvas:', canvas);
console.log('🖼️ Imágenes:', imgs);

console.groupEnd();

// AHORA RECARGA LA PÁGINA Y EJECUTA ESTO DE NUEVO
```

Comparte estos valores conmigo y te diré la solución exacta.
