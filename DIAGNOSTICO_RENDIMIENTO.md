# 🔍 Guía de Diagnóstico de Rendimiento y Memoria

## 📊 Herramientas Instaladas

He agregado herramientas de monitoreo de rendimiento a tu aplicación:

### 1. Monitor Visual de Memoria

En **modo desarrollo**, verás un widget en la esquina inferior derecha que muestra:
- Uso actual de memoria (MB)
- Porcentaje de uso
- Historial gráfico
- Alertas cuando la memoria está alta (>70%) o crítica (>90%)

### 2. Utilidades de Consola

Abre la consola del navegador (F12) y usa estas funciones:

```javascript
// Ver información actual de memoria
window.__performanceUtils.logMemoryInfo()

// Iniciar monitoreo continuo (cada 5 segundos)
window.__performanceUtils.startMemoryMonitoring(5000)

// Detener monitoreo
window.__performanceUtils.stopMemoryMonitoring()

// Análisis completo de rendimiento
window.__performanceUtils.analyzePerformance()

// Contar nodos en el DOM
window.__performanceUtils.countDOMNodes()
```

## 🔧 Cómo Diagnosticar Problemas de Memoria

### Paso 1: Verificar Uso Actual

1. Abre la aplicación en **Brave** (o Chrome)
2. Abre DevTools (F12)
3. En la consola, escribe:
   ```javascript
   window.__performanceUtils.analyzePerformance()
   ```

Esto te mostrará:
- **Memoria usada** (debería ser < 200 MB para una app normal)
- **Nodos DOM** (debería ser < 5000)
- **Tiempos de carga**

### Paso 2: Monitorear en Tiempo Real

```javascript
// Iniciar monitor
window.__performanceUtils.startMemoryMonitoring(3000)
```

Luego **usa la aplicación normalmente** durante 2-3 minutos:
- Navega entre páginas
- Abre y cierra ventanas de chat
- Crea y edita cards
- Envía mensajes

**Observa:** ¿La memoria sigue subiendo sin bajar? → **Memory leak**

### Paso 3: Usar Chrome DevTools Memory Profiler

1. Abre DevTools (F12)
2. Ve a la pestaña **Memory**
3. Selecciona **Heap snapshot**
4. Toma un snapshot inicial
5. Usa la aplicación (abre chats, navega, etc.)
6. Toma otro snapshot
7. Compara los dos snapshots

**Busca:**
- Objetos que aumentan mucho entre snapshots
- Arrays con miles de elementos
- Event listeners no eliminados

### Paso 4: Buscar Memory Leaks

En DevTools, pestaña **Performance**:

1. Click en **Record** (círculo rojo)
2. Usa la aplicación durante 30 segundos
3. Click en **Stop**
4. Mira el gráfico de memoria (línea azul)

**Memory leak** = La línea azul sube constantemente sin bajar

## 🐛 Problemas Comunes Encontrados y Soluciones

### ✅ Suscripciones de Supabase

**Estado:** ✅ **Correctas** - Todos los hooks están limpiando correctamente

Revisé estos hooks que usan suscripciones en tiempo real:
- `useIncomingMessages.ts` ✅
- `useChatMessages.ts` ✅
- `useNewPostsNotification.ts` ✅
- `useCardTodos.ts` ✅
- `useCardMision.ts`
- `useCards.ts`

Todos tienen el patrón correcto:
```typescript
useEffect(() => {
  const channel = supabase.channel('...').subscribe()

  return () => {
    supabase.removeChannel(channel) // ✅ Limpieza correcta
  }
}, [dependencies])
```

### ⚠️ Posibles Causas de Alto Consumo

1. **Demasiadas ventanas de chat abiertas**
   - Cada chat tiene su propia suscripción a mensajes
   - Solución: Limitar número de chats abiertos simultáneamente

2. **Historial de mensajes muy largo**
   - Mensajes se acumulan en el estado
   - Solución: Implementar paginación o limitar a últimos 100 mensajes

3. **Componentes no desmontados**
   - React mantiene componentes en memoria
   - Solución: Verificar que useEffect cleanup funcione

4. **localStorage muy grande**
   - Datos guardados localmente ocupan RAM
   - Solución: Limpiar datos antiguos periódicamente

5. **Demasiados event listeners**
   - Pizarra, drag & drop, etc.
   - Solución: Asegurar cleanup en componentes

## 🛠️ Recomendaciones de Optimización

### 1. Limitar Mensajes en Memoria

En `useChatMessages.ts`, limita los mensajes:

```typescript
setMensajes(prev => {
  const updated = [...prev, nuevoMensaje];
  // Mantener solo los últimos 100 mensajes
  return updated.slice(-100);
});
```

### 2. Limpiar localStorage Periódicamente

Agregar una función que limpie datos antiguos:

```typescript
// Limpiar notificaciones viejas
const cleanOldData = () => {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('new_posts_count_') || key.startsWith('post_notifications_')) {
      // Verificar si es antiguo y eliminar
    }
  });
};
```

### 3. Lazy Loading de Componentes

Usar React.lazy para componentes pesados:

```typescript
const ChatWindow = lazy(() => import('./ChatWindow'));
```

### 4. Virtualización de Listas Largas

Para listas de mensajes o posts, usar `react-window`:

```bash
npm install react-window
```

### 5. Memoización Agresiva

Usar `useMemo` y `useCallback` para evitar re-renders:

```typescript
const memoizedMessages = useMemo(() =>
  mensajes.slice(-100),
  [mensajes]
);
```

## 📈 Métricas Normales vs. Problemáticas

### ✅ Normal (App saludable)
- Memoria: 50-150 MB
- Nodos DOM: < 3000
- Carga inicial: < 3 segundos
- Memory snapshots: Similar entre snapshots después de usar la app

### ⚠️ Alto (Requiere atención)
- Memoria: 150-300 MB
- Nodos DOM: 3000-5000
- Carga inicial: 3-5 segundos
- Memoria aumenta gradualmente pero se estabiliza

### 🚨 Crítico (Memory leak evidente)
- Memoria: > 300 MB y creciendo
- Nodos DOM: > 5000
- Carga inicial: > 5 segundos
- Memoria sube continuamente sin bajar nunca

## 🎯 Próximos Pasos

1. **Ejecuta el análisis ahora:**
   ```javascript
   window.__performanceUtils.analyzePerformance()
   ```

2. **Déjalo monitoreando por 5 minutos:**
   ```javascript
   window.__performanceUtils.startMemoryMonitoring(5000)
   ```

3. **Toma screenshots de Chrome Memory Profiler** si detectas problemas

4. **Comparte los resultados** y podré darte recomendaciones específicas

## 📞 Debugging Adicional

Si necesitas más información sobre componentes específicos, puedes agregar esto temporalmente a cualquier componente:

```typescript
import { useEffect } from 'react';

useEffect(() => {
  console.log('🔍 Componente montado:', 'NombreComponente');
  const memory = (performance as any).memory;
  console.log('Memoria:', memory?.usedJSHeapSize / 1048576, 'MB');

  return () => {
    console.log('🧹 Componente desmontado:', 'NombreComponente');
    console.log('Memoria:', memory?.usedJSHeapSize / 1048576, 'MB');
  };
}, []);
```

---

**Nota:** El monitor visual solo aparece en **modo desarrollo**. No afectará producción.
