# 📋 Tipos Válidos y Ejemplos JSON

Referencia rápida de todos los tipos soportados con ejemplos JSON válidos y listos para usar.

---

## 1️⃣ Nota (create_note)

Crear una nota simple en la pizarra.

### JSON Válido
```json
{
  "action": "create_note",
  "note": {
    "titulo": "Mi Primera Nota",
    "contenido": "Este es el contenido de la nota"
  }
}
```

### Estructura
```json
{
  "action": "create_note",           // ← Requerido, siempre "create_note"
  "note": {
    "titulo": "string",               // ← Requerido
    "contenido": "string"             // ← Requerido
  }
}
```

### Propiedades
| Campo | Tipo | Requerido | Ejemplo | Notas |
|-------|------|-----------|---------|-------|
| action | string | ✅ Sí | "create_note" | Fijo |
| note.titulo | string | ✅ Sí | "Mi Nota" | Max 100 chars |
| note.contenido | string | ✅ Sí | "Contenido aquí" | Max 1000 chars |

### Size en Canvas
- **Ancho:** 200px
- **Alto:** 150px
- **Type:** "text"

### Ejemplos Adicionales

**Ejemplo mínimo:**
```json
{
  "action": "create_note",
  "note": {
    "titulo": "Nota",
    "contenido": "Contenido"
  }
}
```

**Ejemplo completo:**
```json
{
  "action": "create_note",
  "note": {
    "titulo": "Análisis de Mercado Q1 2024",
    "contenido": "Necesitamos analizar tendencias de competidores. Enfoque en segments B2B y B2C. Reunión programada para el viernes."
  }
}
```

---

## 2️⃣ Todo (create_todo)

Crear una tarea/todo en la pizarra.

### JSON Válido
```json
{
  "action": "create_todo",
  "todo": {
    "nombre": "Implementar autenticación",
    "descripcion": "Setup de JWT tokens"
  }
}
```

### Estructura
```json
{
  "action": "create_todo",            // ← Requerido, siempre "create_todo"
  "todo": {
    "nombre": "string",                // ← Requerido
    "descripcion": "string"            // ← Opcional
  }
}
```

### Propiedades
| Campo | Tipo | Requerido | Ejemplo | Notas |
|-------|------|-----------|---------|-------|
| action | string | ✅ Sí | "create_todo" | Fijo |
| todo.nombre | string | ✅ Sí | "Configurar BD" | Max 100 chars |
| todo.descripcion | string | ⭕ No | "Crear schema" | Max 500 chars |

### Size en Canvas
- **Ancho:** 200px
- **Alto:** 150px
- **Type:** "todo"

### Ejemplos Adicionales

**Ejemplo sin descripción:**
```json
{
  "action": "create_todo",
  "todo": {
    "nombre": "Revisar PRs"
  }
}
```

**Ejemplo con descripción:**
```json
{
  "action": "create_todo",
  "todo": {
    "nombre": "Deploy a producción",
    "descripcion": "Ejecutar tests, hacer build, y deployar a AWS"
  }
}
```

---

## 3️⃣ Misión (create_mision)

Crear una misión/sprint/meta grande en la pizarra y guardar en BD.

### JSON Válido
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "Sprint 24 - Login & Dashboard",
    "descripcion": "Implementar autenticación y dashboard inicial",
    "horas": 80,
    "estado": "activa"
  }
}
```

### Estructura
```json
{
  "action": "create_mision",           // ← Requerido, siempre "create_mision"
  "mision": {
    "nombre": "string",                 // ← Requerido
    "descripcion": "string",            // ← Requerido
    "horas": "number",                  // ← Requerido
    "estado": "activa|pausada|cerrada"  // ← Requerido
  }
}
```

### Propiedades
| Campo | Tipo | Requerido | Ejemplo | Notas |
|-------|------|-----------|---------|-------|
| action | string | ✅ Sí | "create_mision" | Fijo |
| mision.nombre | string | ✅ Sí | "Sprint 24" | Max 100 chars |
| mision.descripcion | string | ✅ Sí | "Features..." | Max 500 chars |
| mision.horas | number | ✅ Sí | 80 | Integer positivo |
| mision.estado | string | ✅ Sí | "activa" | Ver valores permitidos |

### Estados Válidos
- `"activa"` - Misión en progreso
- `"pausada"` - Misión pausada (no se trabaja)
- `"cerrada"` - Misión completada

### Size en Canvas
- **Ancho:** 450px
- **Alto:** 320px
- **Type:** "mision"
- **Almacenamiento:** Base de datos Supabase

### Ejemplos Adicionales

**Ejemplo activa:**
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "Refactor Frontend",
    "descripcion": "Migrar a TypeScript y mejorar performance",
    "horas": 120,
    "estado": "activa"
  }
}
```

**Ejemplo pausada:**
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "Investigación de IA",
    "descripcion": "Evaluar modelos de LLM para chat",
    "horas": 40,
    "estado": "pausada"
  }
}
```

**Ejemplo cerrada:**
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "Sprint 23",
    "descripcion": "Completado con éxito",
    "horas": 80,
    "estado": "cerrada"
  }
}
```

---

## 4️⃣ Actividad (create_actividad)

Crear una actividad/evento/reunión en la pizarra y guardar en BD.

### JSON Válido
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "Sprint Planning - Sprint 25",
    "fecha": "2024-02-26",
    "hora_inicio": "14:00",
    "cant_horas": 2
  }
}
```

### Estructura
```json
{
  "action": "create_actividad",        // ← Requerido, siempre "create_actividad"
  "actividad": {
    "descripcion": "string",            // ← Requerido
    "fecha": "YYYY-MM-DD",              // ← Requerido
    "hora_inicio": "HH:MM",             // ← Requerido
    "cant_horas": "number"              // ← Requerido
  }
}
```

### Propiedades
| Campo | Tipo | Requerido | Ejemplo | Notas |
|-------|------|-----------|---------|-------|
| action | string | ✅ Sí | "create_actividad" | Fijo |
| actividad.descripcion | string | ✅ Sí | "Daily Standup" | Max 200 chars |
| actividad.fecha | string | ✅ Sí | "2024-02-26" | Formato YYYY-MM-DD |
| actividad.hora_inicio | string | ✅ Sí | "14:00" | Formato HH:MM (24h) |
| actividad.cant_horas | number | ✅ Sí | 1.5 | Puede ser decimal |

### Formatos

**Fecha:** YYYY-MM-DD (ISO 8601)
- Correcto: `"2024-02-26"`, `"2025-12-31"`
- Incorrecto: `"26-02-2024"`, `"Feb 26, 2024"`

**Hora:** HH:MM (formato 24h)
- Correcto: `"09:30"`, `"14:00"`, `"23:45"`
- Incorrecto: `"9:30"`, `"2:00 PM"`, `"14h00"`

**Horas:** Números (pueden ser decimales)
- Correcto: `1`, `1.5`, `2.5`, `8`
- Incorrecto: `"1 hour"`, `"2h30m"`

### Size en Canvas
- **Ancho:** 380px
- **Alto:** 260px
- **Type:** "actividad"
- **Almacenamiento:** Base de datos Supabase

### Ejemplos Adicionales

**Daily Standup (corto):**
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "Daily Standup",
    "fecha": "2024-02-26",
    "hora_inicio": "09:30",
    "cant_horas": 0.25
  }
}
```

**Planning (largo):**
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "Sprint Planning - Sprint 25",
    "fecha": "2024-02-26",
    "hora_inicio": "14:00",
    "cant_horas": 2
  }
}
```

**Evento tarde:**
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "Retrospectiva Sprint 24",
    "fecha": "2024-02-23",
    "hora_inicio": "17:00",
    "cant_horas": 1.5
  }
}
```

## 5️⃣ Conexión (create_connection)

Crear conexiones automáticas entre items en la importación.

### JSON Válido
```json
{
  "action": "create_connection",
  "connection": {
    "from_index": 0,
    "to_index": 2
  }
}
```

### Estructura
```json
{
  "action": "create_connection",            // ← Requerido, siempre "create_connection"
  "connection": {
    "from_index": "number",                 // ← Requerido, índice del item origen (0-basado)
    "to_index": "number"                    // ← Requerido, índice del item destino (0-basado)
  }
}
```

### Propiedades
| Campo | Tipo | Requerido | Ejemplo | Notas |
|-------|------|-----------|---------|-------|
| action | string | ✅ Sí | "create_connection" | Fijo |
| connection.from_index | number | ✅ Sí | 0 | Índice en array importado |
| connection.to_index | number | ✅ Sí | 2 | Índice en array importado |

### Funcionalidad
- **De/Hacia:** Cualquier tipo de card (nota, todo, misión, actividad)
- **Rendering:** Línea visual con puntos de navegación
- **BD:** Se guarda en tabla `card_connections` de Supabase
- **Interactividad:** Click en la línea navega entre cards

### Ejemplos

**Conexión simple:**
```json
{
  "action": "create_connection",
  "connection": {
    "from_index": 0,
    "to_index": 1
  }
}
```

**Múltiples conexiones en array:**
```json
[
  { "action": "create_connection", "connection": { "from_index": 0, "to_index": 1 } },
  { "action": "create_connection", "connection": { "from_index": 1, "to_index": 2 } },
  { "action": "create_connection", "connection": { "from_index": 2, "to_index": 3 } }
]
```

### Caso de Uso Común
Crear estructura lineal: Nota → Todo → Misión → Actividad

```json
[
  {
    "action": "create_note",
    "note": { "titulo": "Requisitos", "contenido": "Especificación del proyecto" }
  },
  {
    "action": "create_todo",
    "todo": { "nombre": "Implementar feature" }
  },
  {
    "action": "create_mision",
    "mision": { "nombre": "Sprint", "descripcion": "...", "horas": 40, "estado": "activa" }
  },
  {
    "action": "create_actividad",
    "actividad": { "descripcion": "Review", "fecha": "2024-02-26", "hora_inicio": "14:00", "cant_horas": 1 }
  },
  { "action": "create_connection", "connection": { "from_index": 0, "to_index": 1 } },
  { "action": "create_connection", "connection": { "from_index": 1, "to_index": 2 } },
  { "action": "create_connection", "connection": { "from_index": 2, "to_index": 3 } }
]
```

### Caso Avanzado
Crear una misión con múltiples actividades conectadas

```json
[
  {
    "action": "create_mision",
    "mision": {
      "nombre": "Refactor Frontend",
      "descripcion": "Mejorar performance y UX",
      "horas": 80,
      "estado": "activa"
    }
  },
  {
    "action": "create_actividad",
    "actividad": {
      "descripcion": "Análisis de Performance",
      "fecha": "2024-02-26",
      "hora_inicio": "10:00",
      "cant_horas": 2
    }
  },
  {
    "action": "create_actividad",
    "actividad": {
      "descripcion": "Implementación Optimizaciones",
      "fecha": "2024-02-27",
      "hora_inicio": "09:00",
      "cant_horas": 6
    }
  },
  {
    "action": "create_actividad",
    "actividad": {
      "descripcion": "Testing y Deploy",
      "fecha": "2024-02-28",
      "hora_inicio": "14:00",
      "cant_horas": 3
    }
  },
  { "action": "create_connection", "connection": { "from_index": 0, "to_index": 1 } },
  { "action": "create_connection", "connection": { "from_index": 1, "to_index": 2 } },
  { "action": "create_connection", "connection": { "from_index": 2, "to_index": 3 } }
]
```

---

### Ejemplo 1: Nota Simple
```json
[{"action":"create_note","note":{"titulo":"Test","contenido":"Contenido"}}]
```
URL:
```
http://localhost:3000/?import=%5B%7B%22action%22%3A%22create_note%22%2C%22note%22%3A%7B%22titulo%22%3A%22Test%22%2C%22contenido%22%3A%22Contenido%22%7D%7D%5D
```

### Ejemplo 2: Múltiples Items
```json
[
  {"action":"create_note","note":{"titulo":"Nota","contenido":"Contenido"}},
  {"action":"create_todo","todo":{"nombre":"Tarea"}},
  {"action":"create_mision","mision":{"nombre":"Sprint","descripcion":"Test","horas":40,"estado":"activa"}},
  {"action":"create_actividad","actividad":{"descripcion":"Meeting","fecha":"2024-02-26","hora_inicio":"14:00","cant_horas":1}}
]
```

---

## ✅ Validación de JSONs

Para generar URL válida:
```javascript
const items = [
  {
    "action": "create_note",
    "note": {
      "titulo": "Mi Nota",
      "contenido": "Contenido"
    }
  }
];

// CORRECTO
const encoded = encodeURIComponent(JSON.stringify(items));
const url = `http://localhost:3000/?import=${encoded}`;

// INCORRECTO - no funcionará
const badUrl = `http://localhost:3000/?import=${JSON.stringify(items)}`;
```

---

## 📊 Comparativa de Tipos

| Action | Tipo Card | Size | DB | Campos |
|--------|-----------|------|----|----|
| create_note | text | 200×150 | ❌ | titulo, contenido |
| create_todo | todo | 200×150 | ❌ | nombre, descripcion |
| create_mision | mision | 450×320 | ✅ | nombre, descripcion, horas, estado |
| create_actividad | actividad | 380×260 | ✅ | descripcion, fecha, hora_inicio, cant_horas |
| create_connection | N/A | N/A | ✅ | from_index, to_index |

---

## 🔍 Reglas Importantes

1. **Action siempre requerido** - Debe ser exactamente uno de:
   - "create_note"
   - "create_todo"
   - "create_mision"
   - "create_actividad"
   - "create_connection"

2. **Estructura debe ser array** - Incluso con 1 solo item:
   ```json
   [{ "action": "create_note", ... }]  // ✅ Correcto
   { "action": "create_note", ... }    // ❌ Incorrecto
   ```

3. **encodeURIComponent es obligatorio** - Sin esto la URL no funciona:
   ```javascript
   encodeURIComponent(JSON.stringify(items))  // ✅ Correcto
   JSON.stringify(items)                       // ❌ Incorrecto
   ```

4. **Campos requeridos no pueden faltar** - Cada tipo tiene campos obligatorios

5. **Tipos deben ser exactos** - String, number, boolean según especificación

6. **Conexiones usan índices** - El `from_index` y `to_index` son 0-basados:
   ```json
   [
     { "action": "create_note", ... },     // índice 0
     { "action": "create_todo", ... },     // índice 1
     { "action": "create_connection", "connection": { "from_index": 0, "to_index": 1 } }  // ✅ Válido
   ]
   ```

7. **Las conexiones deben venir después** - Todas las conexiones al final del array:
   ```json
   [
     { "action": "create_note", ... },
     { "action": "create_todo", ... },
     { "action": "create_connection", ... },  // ✅ Al final
     { "action": "create_mision", ... }      // ❌ Crear items antes de conexiones
   ]
   ```

---

## 🚀 Copiar y Usar

### Template Nota
```json
{
  "action": "create_note",
  "note": {
    "titulo": "CAMBIAR_TITULO",
    "contenido": "CAMBIAR_CONTENIDO"
  }
}
```

### Template Todo
```json
{
  "action": "create_todo",
  "todo": {
    "nombre": "CAMBIAR_NOMBRE",
    "descripcion": "OPCIONAL"
  }
}
```

### Template Misión
```json
{
  "action": "create_mision",
  "mision": {
    "nombre": "CAMBIAR_NOMBRE",
    "descripcion": "CAMBIAR_DESCRIPCION",
    "horas": 40,
    "estado": "activa"
  }
}
```

### Template Actividad
```json
{
  "action": "create_actividad",
  "actividad": {
    "descripcion": "CAMBIAR_DESCRIPCION",
    "fecha": "2024-02-26",
    "hora_inicio": "14:00",
    "cant_horas": 1
  }
}
```

### Template Conexión
```json
{
  "action": "create_connection",
  "connection": {
    "from_index": 0,
    "to_index": 1
  }
}
```

---

**Versión:** 1.0  
**Última actualización:** Febrero 2024  
**JSON Validados:** ✅ Todos testeados
