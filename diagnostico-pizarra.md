# Diagnóstico: Pizarra no carga desde Supabase

## Problema
La pizarra no se carga cuando se refresca la página. Las cards no aparecen aunque existan en Supabase.

## Flujo esperado
1. **Cargar pizarra del día** → Si no existe, crearla con la fecha de hoy
2. **Cargar cards de la pizarra** → Todas las cards asociadas a esa pizarra
3. **Sincronizar cards** → Mostrar las cards en el canvas

## Puntos de verificación

### 1. ¿Existe la tabla `pizarras` en Supabase?
**Verificar en Supabase Dashboard:**
- Ir a Table Editor
- Buscar tabla `pizarras`
- Debe tener las columnas:
  - `id` (uuid)
  - `id_usuario` (uuid)
  - `pan_offset_x` (numeric)
  - `pan_offset_y` (numeric)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

**Si NO existe**, ejecutar la migración:
```sql
-- Ver archivo: supabase/migrations/create_pizarras_table.sql
```

### 2. ¿RLS está configurado correctamente?
**Verificar en Supabase Dashboard:**
- Ir a Authentication → Policies
- Tabla `pizarras` debe tener:
  - ✅ "Los usuarios pueden ver sus propias pizarras" (SELECT)
  - ✅ "Los usuarios pueden crear sus propias pizarras" (INSERT)
  - ✅ "Los usuarios pueden actualizar sus propias pizarras" (UPDATE)
  - ✅ "Los usuarios pueden eliminar sus propias pizarras" (DELETE)

### 3. ¿El usuario está autenticado?
**Verificar en la consola del navegador:**
```javascript
// Pegar en la consola:
const { data: { user } } = await supabase.auth.getUser();
console.log('Usuario autenticado:', user);
```

Si `user` es `null`, el problema es de autenticación.

### 4. ¿La pizarra se está cargando?
**Buscar en la consola del navegador estos logs:**
```
🎨 Obteniendo pizarra del día para usuario: [uuid] fecha: [fecha]
✅ Pizarra del día encontrada: [id]
```

O si se crea:
```
📝 No existe pizarra del día, creando una nueva...
✅ Pizarra creada exitosamente: [id]
```

**Si NO aparecen estos logs:**
- El hook `usePizarra` no se está ejecutando
- O el `effectiveUserId` es `null`

### 5. ¿Las cards se están cargando desde Supabase?
**Buscar en la consola estos logs:**
```
🃏 Cargando cards de pizarra: [id-pizarra]
✅ Cards cargadas exitosamente: [número]
```

**Si dice "0 cards":**
- Verificar que existan cards en la tabla `cards` con `id_pizarra` = [id-pizarra]
- Verificar RLS de la tabla `cards`

### 6. ¿La sincronización se está ejecutando?
**Buscar en la consola estos logs:**
```
🔍 [PIZARRA] useEffect sincronización disparado
🔍 [PIZARRA] shouldSyncFromDB retornó: true
🔄 [PIZARRA] Iniciando sincronización de cards desde Supabase...
✅ [PIZARRA] X cards sincronizadas desde Supabase
```

**Si `shouldSyncFromDB retornó: false`:**
- Puede ser porque `isInitialized` ya es `true`
- O porque no hay cards en Supabase

## Comandos de diagnóstico

### Ver pizarras del usuario actual
```sql
SELECT * FROM pizarras
WHERE id_usuario = auth.uid()
ORDER BY created_at DESC
LIMIT 5;
```

### Ver pizarra del día actual
```sql
SELECT * FROM pizarras
WHERE id_usuario = auth.uid()
AND created_at >= CURRENT_DATE
AND created_at < CURRENT_DATE + INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 1;
```

### Ver cards de una pizarra específica
```sql
SELECT * FROM cards
WHERE id_pizarra = '[id-de-pizarra]'
ORDER BY created_at;
```

### Ver todas las policies de la tabla pizarras
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'pizarras';
```

## Soluciones comunes

### Problema: "No se carga nada"
**Solución:**
1. Abrir DevTools → Console
2. Buscar errores en rojo
3. Si dice "relation pizarras does not exist" → Ejecutar migración SQL
4. Si dice "permission denied" → Configurar RLS

### Problema: "Se carga pero sin cards"
**Solución:**
1. Verificar que existan cards en Supabase con el `id_pizarra` correcto
2. Revisar RLS de la tabla `cards`
3. Forzar sincronización refrescando (F5)

### Problema: "Se carga en modo incógnito pero no en modo normal"
**Solución:**
- Limpiar localStorage: `localStorage.clear()`
- Limpiar cache del navegador
- Hacer hard refresh (Ctrl+Shift+R)

## Script de diagnóstico completo

Pegar en la consola del navegador:

```javascript
async function diagnosticoPizarra() {
  console.log('=== DIAGNÓSTICO PIZARRA ===');

  // 1. Usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  console.log('1. Usuario:', user?.id, user?.email);

  if (!user) {
    console.error('❌ No hay usuario autenticado');
    return;
  }

  // 2. Pizarras del usuario
  const { data: pizarras, error: errorPizarras } = await supabase
    .from('pizarras')
    .select('*')
    .eq('id_usuario', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('2. Pizarras del usuario:', pizarras?.length || 0);
  console.log('   Datos:', pizarras);
  console.log('   Error:', errorPizarras);

  if (!pizarras || pizarras.length === 0) {
    console.warn('⚠️ No hay pizarras en Supabase');
    return;
  }

  // 3. Pizarra del día
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);

  const { data: pizarraHoy, error: errorHoy } = await supabase
    .from('pizarras')
    .select('*')
    .eq('id_usuario', user.id)
    .gte('created_at', hoy.toISOString())
    .lte('created_at', fin.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('3. Pizarra del día:', pizarraHoy);
  console.log('   Error:', errorHoy);

  if (!pizarraHoy) {
    console.warn('⚠️ No hay pizarra del día');
    return;
  }

  // 4. Cards de la pizarra del día
  const { data: cards, error: errorCards } = await supabase
    .from('cards')
    .select('*')
    .eq('id_pizarra', pizarraHoy.id);

  console.log('4. Cards de la pizarra:', cards?.length || 0);
  console.log('   Datos:', cards);
  console.log('   Error:', errorCards);

  // 5. RLS Policies
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'pizarras');

  console.log('5. Policies de pizarras:', policies);

  console.log('=== FIN DIAGNÓSTICO ===');
}

diagnosticoPizarra();
```

## Resultado esperado
```
=== DIAGNÓSTICO PIZARRA ===
1. Usuario: [uuid] [email]
2. Pizarras del usuario: 5
3. Pizarra del día: { id: "...", id_usuario: "...", ... }
4. Cards de la pizarra: 10
5. Policies de pizarras: [...]
=== FIN DIAGNÓSTICO ===
```
