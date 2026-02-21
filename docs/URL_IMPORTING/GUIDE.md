# 📖 Guía de Sistema de Importación URL

Sistema para importar items (notas, todos, misiones, actividades) a la pizarra mediante URLs codificadas en JSON.

---

## 🚀 Inicio Rápido (5 minutos)

### Opción 1: Usar URL de Ejemplo
```
http://localhost:3000/?import=%5B%7B%22action%22%3A%22create_note%22%2C%22note%22%3A%7B%22titulo%22%3A%22Mi%20Nota%22%2C%22contenido%22%3A%22Contenido%22%7D%7D%5D
```

### Opción 2: Crear Tu Propia URL
1. Define tu JSON con los items:
```json
[
  {
    "action": "create_note",
    "note": { "titulo": "Mi Nota", "contenido": "Contenido" }
  }
]
```

2. Codifica con JavaScript:
```javascript
const json = [{ action: "create_note", note: { titulo: "Mi Nota", contenido: "Contenido" } }];
const encoded = encodeURIComponent(JSON.stringify(json));
const url = `http://localhost:3000/?import=${encoded}`;
console.log(url);
```

3. Pega en navegador → Modal abre automáticamente → Click para importar

---

## 📋 Cómo Funciona

### Flujo de Datos
```
1. URL con ?import=ENCODED_JSON llega al navegador
   ↓
2. Pizarra.tsx detecta parámetro (debe tener "use client")
   ↓
3. Modal ImportAIModal abre automáticamente
   ↓
4. Usuario ve preview de items a importar
   ↓
5. Click en botón → handleImportCards() procesa
   ↓
6. Crea cards en canvas:
   - Cards normales (200×150, type: text/todo)
   - Misiones (450×320, type: mision)
   - Actividades (380×260, type: actividad)
   ↓
7. Crea conexiones entre las cards:
   - Lee índices (from_index, to_index)
   - Mapea a Card IDs reales
   - Crea Connection objects
   - Renderiza SVG lines automáticamente
   ↓
8. Todo se guarda en Supabase:
   - Cards en tabla cards
   - Misiones en tabla misiones
   - Actividades en tabla actividades
   - Conexiones en tabla card_connections
```

### Cambios Implementados

| Cambio | Archivo | Línea | Reason |
|--------|---------|-------|---------|
| Agregar import `generateUniqueId` | ImportAIModal.tsx | 5 | Sin esto: Error "not defined" |
| Agregar `"use client"` | pizarra.tsx | 1 | Next.js 15 requiere para hooks |
| Reescribir `handleImportCards` | pizarra.tsx | 1474-1660 | Procesar 3 tipos + conexiones |
| Agregar procesamiento de conexiones | ImportAIModal.tsx | 300-370 | Mapear índices → Card IDs |

---

## 🎯 Tipos de Items Soportados

### 1. Nota
```json
{
  "action": "create_note",
  "note": {
    "titulo": "Mi Nota",
    "contenido": "Contenido de la nota"
  }
}
```
- **Size:** 200×150px
- **Campos:** titulo, contenido
- **Type en card:** "text"

### 2. Todo
```json
{
  "action": "create_todo",
  "todo": {
    "nombre": "Tarea importante",
    "descripcion": "Descripción opcional"
  }
}
```
- **Size:** 200×150px
- **Campos:** nombre, descripcion (opcional)
- **Type en card:** "todo"

### 3. Misión
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "Sprint 24",
    "descripcion": "Features de login",
    "horas": 80,
    "estado": "activa"
  }
}
```
- **Size:** 450×320px
- **Campos:** nombre, descripcion, horas, estado
- **Type en card:** "mision"
- **Almacenamiento:** Base de datos Supabase

### 4. Actividad
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "Daily standup",
    "fecha": "2024-02-26",
    "hora_inicio": "09:30",
    "cant_horas": 0.5
  }
}
```
- **Size:** 380×260px
- **Campos:** descripcion, fecha, hora_inicio, cant_horas
- **Type en card:** "actividad"
- **Almacenamiento:** Base de datos Supabase

---

## 📝 Ejemplo Completo

Importar múltiples items en una sola URL:

```json
[
  {
    "action": "create_note",
    "note": { "titulo": "Bienvenida", "contenido": "Proyecto iniciado" }
  },
  {
    "action": "create_todo",
    "todo": { "nombre": "Configurar git" }
  },
  {
    "action": "create_mision",
    "mision": {
      "nombre": "Sprint Planning",
      "descripcion": "Planificar features",
      "horas": 40,
      "estado": "activa"
    }
  },
  {
    "action": "create_actividad",
    "actividad": {
      "descripcion": "Kickoff meeting",
      "fecha": "2024-02-26",
      "hora_inicio": "14:00",
      "cant_horas": 1.5
    }
  }
]
```

Codificar:
```javascript
const encoded = encodeURIComponent(JSON.stringify([...]));
const url = `http://localhost:3000/?import=${encoded}`;
```

---

## ⚙️ Configuración Técnica

### Archivos Clave

**pizarra.tsx** (componente principal)
```typescript
"use client"; // ← Requerido

export default function Pizarra() {
  const searchParams = useSearchParams();
  const importParam = searchParams?.get('import'); // Detecta ?import=...
  
  const handleImportCards = useCallback((data) => {
    // Procesa 4 arrays: cards, misiones, actividades, connections
    // 1. Crea cards en pizarra
    // 2. Crea conexiones entre cards
    // 3. Guarda todo en Supabase
  }, []);
}
```

**ImportAIModal.tsx** (modal automático)
```typescript
import { generateUniqueId } from '../../utils/idGenerator'; // ← Required

export function ImportAIModal({ isOpen, onClose, onImport }) {
  // Detecta items (incluyendo conexiones)
  // Muestra preview de cards + conexiones
  // Usuario confirma → llama onImport con connections
}
```

**useConnections.ts** (manejo de conexiones)
```typescript
const { connections, isConnecting, connectingFrom } = useConnections({
  cards,
  onConnectionCreate: handleInternalConnectionCreate
});

// Para importar conexiones:
// connections.map(conn => ({ from: cardId1, to: cardId2, ...etc }))
```

---

## 🔒 Consideraciones de Seguridad

| Aspecto | Status | Nota |
|--------|--------|------|
| URL visible en browser | ⚠️ | JSON está en historial |
| Caracteres sensibles | ⚠️ | Usar encodeURIComponent |
| Validation | ✅ | Supabase valida en backend |
| Rate limiting | ❌ | Considerar agregar |
| HTTPS | ✅ | Recomendado en producción |

---

## 📊 Tamaños de Cards

| Type | Ancho | Alto | Mejor Para |
|------|-------|------|-----------|
| text | 200px | 150px | Notas |
| todo | 200px | 150px | Tareas |
| mision | 450px | 320px | Sprints/Metas |
| actividad | 380px | 260px | Eventos/Llamadas |

---

## ⚡ Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Modal no abre | `"use client"` faltante | Verificar pizarra.tsx línea 1 |
| generateUniqueId not defined | Import faltante | Verificar ImportAIModal.tsx línea 5 |
| JSON inválido | Encoding incorrecto | Usar `encodeURIComponent()` |
| Cards no aparecen | Array vacío | Verificar JSON structure |
| Muy lento | Muchos items | Reducir cantidad |

---

## 🎓 Casos de Uso

### Caso 1: Compartir Sprint
Ejecutivo crea JSON con sprint, lo codifica, envía link a equipo.

### Caso 2: Importar Proyecto
Backend genera JSON dinamically, envía URL a usuario.

### Caso 3: Template de Pizarra
Guardar estructura común como JSON, permitir reutilización.

### Caso 4: Migración
Exportar datos, codificar como JSON, importar en otra instancia.

---

## 📂 Archivos Disponibles

- `GUIDE.md` (este archivo) - Documentación completa
- `TYPES_AND_EXAMPLES.md` - Tipos válidos con JSONs
- `test_files/` - URLs listas para probar

---

## ✅ Validación

Para validar JSON:
```bash
node validate-test-files.js
```

---

## 🔧 Usar desde Backend

```javascript
// Node.js / Express
app.get('/generate-import-link', (req, res) => {
  const items = [
    {
      action: 'create_mision',
      mision: {
        nombre: 'Mi Misión',
        descripcion: 'Descripción',
        horas: 40,
        estado: 'activa'
      }
    }
  ];
  
  const encoded = encodeURIComponent(JSON.stringify(items));
  const link = `https://tuapp.com/?import=${encoded}`;
  
  res.json({ link });
});
```

---

## 📈 Performance

- ✅ Hasta 100-200 items: Excelente
- ⚠️ 200-500 items: Aceptable
- ❌ 500+ items: Lento (considerar virtualización)

---

## 🚀 Próximas Mejoras

- [ ] Agregar tipo "Proyecto"
- [ ] Server-side URL validation
- [ ] Rate limiting
- [ ] Batch preview mejorado
- [ ] Export a JSON
- [ ] Undo/redo

---

**Status:** ✅ Funcional  
**Última actualización:** Febrero 2024  
**Versión:** 1.0
