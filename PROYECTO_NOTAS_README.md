# Sistema de Notas en Card de Proyecto

## 📋 Resumen

Este sistema permite que los **cards de tipo `proyecto`** tengan una **lista de notas** (cards de tipo `text`) asociadas, guardadas y cargadas desde Supabase, similar a cómo funcionan los TODOs en el `TodoCard`.

---

## 🗄️ Estructura de Base de Datos

### Tabla: `card_proyecto_notas`

```sql
CREATE TABLE card_proyecto_notas (
  id UUID PRIMARY KEY,
  id_card_proyecto UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  id_card_nota UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(id_card_proyecto, id_card_nota)
);
```

**Campos:**
- `id_card_proyecto`: UUID del card de proyecto
- `id_card_nota`: UUID del card de tipo `text` (la nota)
- `position`: Orden de la nota en la lista

---

## 📁 Archivos Creados/Modificados

### 1. **Migración SQL**
📄 `supabase/migrations/create_card_proyecto_notas.sql`
- Crea la tabla de relación
- Índices para performance
- Trigger para `updated_at`

### 2. **Entidades**
📄 `domain/entities/CardProyectoNota.ts`
- `CardProyectoNota`: Entidad principal
- `CreateCardProyectoNotaDTO`: DTO para crear
- `UpdateCardProyectoNotaDTO`: DTO para actualizar

### 3. **Repositorio**
📄 `infrastructure/repositories/CardProyectoNotaRepository.ts`
- Interface del repositorio

📄 `infrastructure/datasource/SupabaseCardProyectoNotaRepository.ts`
- Implementación con Supabase
- Métodos:
  - `getByCardProyectoId()` - Obtener notas de un proyecto
  - `create()` - Crear relación
  - `delete()` - Eliminar relación
  - `deleteAllByProyecto()` - Eliminar todas las notas

### 4. **Tipos**
📄 `application/pizarra/types/index.ts`
- Agregado campo `notas?: string[]` a `ProyectoData`

### 5. **Lógica de Carga**
📄 `application/pizarra/pizarra.tsx` (líneas 362-377)

```typescript
if (cardDB.type === 'proyecto' || cardDB.type === 'proyecto-organizacion') {
  const proyectoNotas = await cardProyectoNotaRepo.getByCardProyectoId(cardDB.id);
  if (proyectoNotas && proyectoNotas.length > 0) {
    card.proyectoData.notas = proyectoNotas.map(nota => nota.id_card_nota);
  }
}
```

### 6. **Lógica de Guardado**
📄 `application/pizarra/pizarra.tsx`

#### **Al CREAR un card de proyecto** (líneas 1817-1830):
```typescript
if (createdCard && (card.type === 'proyecto' || card.type === 'proyecto-organizacion')
    && card.proyectoData?.notas && card.proyectoData.notas.length > 0) {
  for (let i = 0; i < card.proyectoData.notas.length; i++) {
    await cardProyectoNotaRepo.create({
      id_card_proyecto: createdCard.id,
      id_card_nota: card.proyectoData.notas[i],
      position: i
    });
  }
}
```

#### **Al ACTUALIZAR un card de proyecto existente** (líneas 1707-1744):
```typescript
// 1. Obtener notas existentes en BD
const notasExistentes = await cardProyectoNotaRepo.getByCardProyectoId(cardUUID);

// 2. Eliminar notas que ya no están en la lista
for (const notaExistente of notasExistentes) {
  if (!card.proyectoData.notas.includes(notaExistente.id_card_nota)) {
    await cardProyectoNotaRepo.delete(cardUUID, notaExistente.id_card_nota);
  }
}

// 3. Crear nuevas notas que no existían
for (const notaCardId of card.proyectoData.notas) {
  if (!notasExistentesIds.includes(notaCardId)) {
    await cardProyectoNotaRepo.create({...});
  }
}
```

---

## 🔄 Flujo Completo

### **GUARDADO:**

1. Usuario modifica la lista de notas en `card.proyectoData.notas`
2. Después de 3 segundos → `saveToSupabase()` se ejecuta
3. Para cada card de proyecto:
   - Si es **nuevo**: Crea todas las relaciones en `card_proyecto_notas`
   - Si **existe**:
     - Elimina relaciones que ya no existen
     - Crea nuevas relaciones que no existían

### **CARGA:**

1. `useCards()` carga todas las cards de la pizarra
2. Para cada card de tipo `proyecto` o `proyecto-organizacion`:
   - Consulta `card_proyecto_notas` para obtener las relaciones
   - Extrae los IDs de las notas
   - Los guarda en `card.proyectoData.notas`

---

## 🎯 Cómo Usar

### En el código del ProyectoCard:

```typescript
// Obtener las notas asociadas
const notasIds = card.proyectoData?.notas || [];

// Obtener los cards completos de las notas
const notasCards = cards.filter(c => notasIds.includes(c.id));

// Agregar una nota
card.proyectoData.notas = [...(card.proyectoData.notas || []), nuevoNotaCardId];

// Eliminar una nota
card.proyectoData.notas = card.proyectoData.notas.filter(id => id !== notaIdToRemove);
```

---

## 📝 Próximos Pasos

1. ✅ **Ejecutar la migración** en Supabase:
   ```bash
   # Copiar el contenido de:
   # supabase/migrations/create_card_proyecto_notas.sql
   # Y ejecutarlo en el SQL Editor de Supabase
   ```

2. 🔜 **Modificar ProyectoCard.tsx** para:
   - Mostrar las notas asociadas
   - Permitir agregar/eliminar notas desde el UI
   - Mostrar el contenido de las notas

3. 🔜 **Agregar lógica de conexión automática** (opcional):
   - Cuando se conecta un card `text` con un card `proyecto`
   - Automáticamente agregar el ID a `proyectoData.notas`

---

## ⚠️ Importante

- Similar a los TODOs, las notas se guardan **solo si el card ya tiene UUID** (está guardado en Supabase)
- Los cards nuevos (con IDs temporales como "proyecto-1") **NO** guardarán las relaciones hasta el primer `saveToSupabase()`
- Las relaciones tienen `ON DELETE CASCADE`, así que si se elimina el proyecto o la nota, se eliminan automáticamente las relaciones

---

## 🔍 Debugging

Para verificar que funciona:

```sql
-- Ver todas las relaciones proyecto-nota
SELECT
  cp.id,
  cp.title as proyecto,
  cn.title as nota,
  cpn.position
FROM card_proyecto_notas cpn
JOIN cards cp ON cp.id = cpn.id_card_proyecto
JOIN cards cn ON cn.id = cpn.id_card_nota
ORDER BY cp.title, cpn.position;
```

---

**¡Sistema listo para usar!** 🎉
