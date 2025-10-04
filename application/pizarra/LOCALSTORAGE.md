# 💾 LocalStorage en Pizarra

## 📋 Resumen

La pizarra ahora **guarda automáticamente** todo su contenido en localStorage, incluyendo:
- ✅ Todas las cards (posición, tamaño, contenido)
- ✅ Conexiones entre cards
- ✅ Posición del canvas (pan offset)
- ✅ Todos los datos específicos de cada tipo de card (ActivityData, TodoItems, etc.)

## 🔧 Modelo de Card

```typescript
interface Card {
  id: string;              // ID único generado
  type: string;            // 'actividad', 'todo', 'proyecto', etc.
  title: string;           // Título de la card
  content: string;         // Contenido/descripción
  x: number;              // Posición X en canvas
  y: number;              // Posición Y en canvas
  width: number;          // Ancho de la card
  height: number;         // Alto de la card
  fontSize?: number;      // Tamaño de fuente personalizado

  // Datos específicos según tipo
  todos?: TodoItem[];           // Para cards de tipo 'todo'
  activityData?: ActivityData;  // Para cards de tipo 'actividad'
  misionData?: MisionData;      // Para cards de tipo 'mision'
  usuarioData?: UsuarioData;    // Para cards de tipo 'usuario'
  proyectoData?: ProyectoData;  // Para cards de tipo 'proyecto'
}
```

## 🎯 Características

### Auto-guardado
- ⏱️ **Guardado automático** cada 1 segundo después de cambios
- 🔄 **Carga automática** al iniciar la aplicación
- 💪 **Manejo de errores** robusto con try/catch

### Datos Guardados

```typescript
interface PizarraStorageData {
  cards: Card[];                    // Todas las cards
  connections: Connection[];        // Conexiones entre cards
  panOffset: { x: number; y: number }; // Posición del canvas
  lastSaved: string;               // Timestamp del último guardado
}
```

### Keys de LocalStorage

```typescript
PIZARRA_STORAGE_KEY = 'pizarra-cards-v1'
CONNECTIONS_STORAGE_KEY = 'pizarra-connections-v1'
PAN_OFFSET_STORAGE_KEY = 'pizarra-pan-offset-v1'
```

## 🎮 Controles en UI

### Botón "🗑️ Limpiar Todo"
- Elimina TODAS las cards de la pizarra
- Borra TODAS las conexiones
- Limpia el localStorage
- Resetea la posición del canvas

### Botón "📤 Exportar"
- Descarga un archivo JSON con todo el contenido
- Formato: `pizarra-backup-YYYY-MM-DD.json`
- Incluye fecha de guardado
- Útil para respaldos

### Botón "📥 Importar"
- Abre diálogo para seleccionar archivo JSON
- Restaura cards, conexiones y posición
- Actualiza automáticamente el localStorage
- Muestra mensaje de éxito/error

## 📦 Hook: usePizarraLocalStorage

```typescript
const {
  loadFromLocalStorage,  // Cargar manualmente
  saveToLocalStorage,    // Guardar manualmente
  clearLocalStorage,     // Limpiar todo
  exportToJSON,         // Exportar a archivo
  importFromJSON        // Importar desde JSON
} = usePizarraLocalStorage(
  cards,
  connections,
  panOffset,
  setCards,
  setConnections,
  setPanOffset
);
```

## 🔄 Flujo de Datos

### Al Iniciar la App
```
1. Componente monta
2. usePizarraLocalStorage lee localStorage
3. Si hay datos guardados:
   - Parsea JSON
   - Restaura Date objects
   - Setea cards, connections, panOffset
4. Renderiza pizarra con datos restaurados
```

### Durante Uso
```
1. Usuario modifica card (mueve, edita, etc.)
2. setCards actualiza estado
3. useEffect detecta cambio
4. Espera 1 segundo (debounce)
5. Guarda automáticamente en localStorage
```

## 🛡️ Manejo de Errores

### Casos Manejados
- ✅ localStorage no disponible
- ✅ JSON corrupto o inválido
- ✅ Quota excedida de localStorage
- ✅ Date objects serializados

### Ejemplo de Restauración de Dates
```typescript
// ChatMessages tienen timestamps como Date
const cardsWithDates = parsedCards.map(card => {
  if (card.usuarioData?.messages) {
    return {
      ...card,
      usuarioData: {
        ...card.usuarioData,
        messages: card.usuarioData.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp) // ← Restaura Date
        }))
      }
    };
  }
  return card;
});
```

## 💡 Ejemplo de Uso

### Exportar Backup
```javascript
// Click en botón "📤 Exportar"
// Se descarga: pizarra-backup-2025-01-15.json
```

### Importar Backup
```javascript
// Click en botón "📥 Importar"
// Selecciona archivo JSON
// ✅ Pizarra restaurada con todos los datos
```

### Limpiar Todo
```javascript
// Click en botón "🗑️ Limpiar Todo"
// ⚠️ CUIDADO: Esta acción no se puede deshacer
// Exporta un backup antes si es necesario
```

## 🔍 Debug

Para ver qué hay guardado en localStorage:

```javascript
// En consola del navegador
console.log(JSON.parse(localStorage.getItem('pizarra-cards-v1')));
console.log(JSON.parse(localStorage.getItem('pizarra-connections-v1')));
console.log(JSON.parse(localStorage.getItem('pizarra-pan-offset-v1')));
```

## 📊 Límites de localStorage

- **Máximo**: ~5-10MB dependiendo del navegador
- **Recomendación**: Exportar backups regularmente
- **Si excedes**: Aparecerá error en consola, usa exportar/importar

## 🚀 Mejoras Futuras Posibles

- [ ] Múltiples pizarras (guardar con ID de usuario)
- [ ] Sincronización con backend/Supabase
- [ ] Historial de cambios (undo/redo)
- [ ] Auto-backup programado
- [ ] Compartir pizarras (export link)
