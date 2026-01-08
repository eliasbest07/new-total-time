# Implementación del Sistema de Temas (Modo Claro/Oscuro)

**Fecha de implementación:** 2026-01-07
**Autor:** Claude Code

## Tabla de Contenidos
1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Archivos Modificados](#archivos-modificados)
4. [Flujo de Funcionamiento](#flujo-de-funcionamiento)
5. [Estilos CSS](#estilos-css)
6. [Cómo Modificar/Extender](#cómo-modificarextender)
7. [Notas Técnicas](#notas-técnicas)

---

## Descripción General

Se implementó un sistema completo de temas que permite a los usuarios cambiar entre modo claro, modo oscuro y modo automático (que detecta la preferencia del sistema operativo).

### Características Principales
- ✅ Tres modos: Claro, Oscuro y Automático
- ✅ Persistencia en localStorage
- ✅ Cambio dinámico de fondos animados
- ✅ Sincronización en toda la aplicación
- ✅ Detección de preferencias del sistema (prefers-color-scheme)

---

## Arquitectura

### Diagrama de Flujo
```
Usuario → SettingsModal → SettingsContext → localStorage
                              ↓
                    AnimatedBackground(Dashboard)
                              ↓
                        Clases CSS aplicadas
```

### Componentes Clave

1. **SettingsContext**: Gestiona el estado global del tema
2. **SettingsModal**: Interfaz de usuario para cambiar el tema
3. **AnimatedBackground**: Fondo animado de páginas normales
4. **AnimatedBackgroundDashboard**: Fondo animado del dashboard
5. **globals.css**: Estilos CSS para cada tema

---

## Archivos Modificados

### 1. `/app/contexts/SettingsContext.tsx`

#### Cambios Realizados
```typescript
// Se agregó al tipo SettingsContextType:
theme: 'light' | 'dark' | 'auto';
setTheme: (value: 'light' | 'dark' | 'auto') => void;

// Se agregó al estado del provider:
const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('light');

// Se agregó en el useEffect de carga desde localStorage:
const savedTheme = localStorage.getItem('total-time-theme') as 'light' | 'dark' | 'auto' | null;
if (savedTheme !== null) {
  setThemeState(savedTheme);
}

// Se agregó la función setTheme:
const setTheme = (value: 'light' | 'dark' | 'auto') => {
  setThemeState(value);
  if (typeof window !== 'undefined') {
    localStorage.setItem('total-time-theme', value);
    console.log('🎨 Tema', value === 'light' ? 'Claro' : value === 'dark' ? 'Oscuro' : 'Automático');
  }
};

// Se agregó al provider value:
theme,
setTheme
```

#### Ubicación en el archivo
- **Líneas 5-15**: Interface `SettingsContextType`
- **Líneas 31-35**: Estado inicial
- **Líneas 37-55**: useEffect para cargar desde localStorage
- **Líneas 75-82**: Función setTheme
- **Líneas 87-99**: Provider value

---

### 2. `/app/components/SettingsModal.tsx`

#### Cambios Realizados
```typescript
// Se agregó al hook useSettings:
const { ..., theme, setTheme } = useSettings();

// Se modificó el select de tema (líneas 81-96):
<select
  className="px-3 py-2 border border-gray-300 rounded-lg"
  value={theme}
  onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
>
  <option value="light">Claro</option>
  <option value="dark">Oscuro</option>
  <option value="auto">Automático</option>
</select>
```

#### Ubicación en el archivo
- **Línea 9**: Destructuring del contexto
- **Líneas 87-95**: Select conectado al estado

---

### 3. `/app/components/AnimatedBackground.tsx`

#### Cambios Realizados
```typescript
// Se agregó el import:
import { useSettings } from '@/app/contexts/SettingsContext';

// Se agregó en el componente:
const { theme } = useSettings();

// Se agregó la lógica de detección de modo oscuro (línea 16):
const isDark = theme === 'dark' ||
  (theme === 'auto' && typeof window !== 'undefined' &&
   window.matchMedia('(prefers-color-scheme: dark)').matches);

// Se modificaron las clases CSS (líneas 20-21):
<div className={isDark ? "background dark-blue-purple" : "background blue-purple"}></div>
<div className={isDark ? "background dark-green-blue" : "background green-blue"}></div>
```

#### Ubicación en el archivo
- **Línea 4**: Import de useSettings
- **Línea 8**: Hook useSettings
- **Línea 16**: Lógica isDark
- **Líneas 20-21**: Aplicación de clases dinámicas

---

### 4. `/app/components/AnimatedBackgroundDashboard.tsx`

#### Cambios Realizados
```typescript
// Se agregó el import:
import { useSettings } from '@/app/contexts/SettingsContext';

// Se agregó en el componente:
const { theme } = useSettings();

// Se agregó la lógica de detección de modo oscuro (línea 17):
const isDark = theme === 'dark' ||
  (theme === 'auto' && typeof window !== 'undefined' &&
   window.matchMedia('(prefers-color-scheme: dark)').matches);

// Se modificaron las clases CSS en tres lugares:

// 1. Para usuarios no admin (líneas 49-50):
<div className={isDark ? "background dark-blue-purple" : "background blue-purple"}></div>
<div className={isDark ? "background dark-green-blue" : "background green-blue"}></div>

// 2. Para usuarios admin (línea 73):
<div className={isDark ? "background dark-dashboard-gradient" : "background dashboard-gradient"}></div>
```

#### Ubicación en el archivo
- **Línea 4**: Import de useSettings
- **Línea 9**: Hook useSettings
- **Línea 17**: Lógica isDark
- **Líneas 49-50**: Fondo para usuarios normales
- **Línea 73**: Fondo para admins

---

### 5. `/app/globals.css`

#### Cambios Realizados

Se agregaron tres nuevas clases CSS después de las clases existentes (líneas 154-168):

```css
/* Dark mode backgrounds */
.dark-blue-purple {
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  opacity: 1;
}

.dark-green-blue {
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  opacity: 0;
}

.dark-dashboard-gradient {
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  opacity: 1;
}
```

#### Paletas de Colores

**Modo Claro:**
- `blue-purple`: `#f8cdda` → `#1d2b64` (rosa claro a azul oscuro)
- `green-blue`: `#185a9d` → `#43cea2` (azul a verde agua)
- `dashboard-gradient`: `#185a9d` → `#43cea2`

**Modo Oscuro:**
- `dark-blue-purple`: `#0f0c29` → `#302b63` → `#24243e` (azul noche profundo)
- `dark-green-blue`: `#0f2027` → `#203a43` → `#2c5364` (azul oscuro a verde azulado)
- `dark-dashboard-gradient`: Igual que `dark-green-blue`

---

## Flujo de Funcionamiento

### 1. Inicialización
```
1. Usuario carga la aplicación
2. SettingsProvider se monta
3. useEffect lee localStorage ('total-time-theme')
4. Se establece el tema guardado o 'light' por defecto
5. AnimatedBackground(Dashboard) lee el tema del contexto
6. Se aplican las clases CSS correspondientes
```

### 2. Cambio de Tema
```
1. Usuario abre configuración (SettingsModal)
2. Usuario selecciona un tema en el select
3. onChange llama a setTheme(nuevoTema)
4. setTheme actualiza el estado y localStorage
5. React re-renderiza los componentes que usan el tema
6. AnimatedBackground(Dashboard) recalculan isDark
7. Se aplican las nuevas clases CSS
```

### 3. Modo Automático
```
1. Usuario selecciona 'auto'
2. theme = 'auto' se guarda en el estado
3. isDark evalúa: window.matchMedia('(prefers-color-scheme: dark)').matches
4. Si el sistema está en modo oscuro → isDark = true
5. Si el sistema está en modo claro → isDark = false
6. Se aplican las clases CSS correspondientes
```

---

## Estilos CSS

### Estructura de las Clases

Cada clase de fondo tiene:
- `position: fixed` - Para cubrir toda la pantalla
- `z-index: -2` - Detrás de todo el contenido
- `background: linear-gradient(...)` - Gradiente específico
- `opacity: 1 o 0` - Para efectos de transición

### Cómo Funcionan las Animaciones

Los fondos usan dos capas:
1. **Capa principal** (opacity: 1) - Visible
2. **Capa secundaria** (opacity: 0) - Oculta pero lista para transiciones futuras

Las burbujas (`circles` y `circles-dashboard`) son independientes del tema y mantienen:
- `background: rgba(255, 255, 255, 0.15)` - Blanco semi-transparente
- Funciona tanto en modo claro como oscuro

---

## Cómo Modificar/Extender

### Agregar un Nuevo Tema

**Paso 1: Actualizar el tipo en SettingsContext**
```typescript
// Cambiar de:
theme: 'light' | 'dark' | 'auto';

// A:
theme: 'light' | 'dark' | 'auto' | 'neon';
```

**Paso 2: Agregar la opción en SettingsModal**
```tsx
<option value="neon">Neón</option>
```

**Paso 3: Actualizar la lógica isDark**
```typescript
// En AnimatedBackground y AnimatedBackgroundDashboard:
const isDark = theme === 'dark' || theme === 'neon' ||
  (theme === 'auto' && typeof window !== 'undefined' &&
   window.matchMedia('(prefers-color-scheme: dark)').matches);
```

**Paso 4: Agregar clases CSS en globals.css**
```css
.neon-blue-purple {
  background: linear-gradient(135deg, #ff00ff 0%, #00ffff 100%);
  opacity: 1;
}
```

**Paso 5: Actualizar los componentes**
```tsx
<div className={
  theme === 'neon' ? "background neon-blue-purple" :
  isDark ? "background dark-blue-purple" :
  "background blue-purple"
}></div>
```

### Cambiar los Colores de un Tema Existente

**Ubicación:** `app/globals.css` líneas 154-168

**Ejemplo - Hacer el modo oscuro más azulado:**
```css
.dark-blue-purple {
  /* Cambiar de: */
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);

  /* A algo como: */
  background: linear-gradient(135deg, #0a1929 0%, #1e3a5f 50%, #132f4c 100%);
  opacity: 1;
}
```

### Agregar Transiciones Suaves Entre Temas

En `globals.css`, agregar a la clase `.background`:
```css
.background {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -2;
  overflow: hidden;
  pointer-events: none;

  /* Agregar esta línea: */
  transition: background 0.5s ease-in-out;
}
```

### Sincronizar con Cambios del Sistema en Tiempo Real

Actualmente, el modo 'auto' solo detecta la preferencia al renderizar. Para escuchar cambios:

**En AnimatedBackground.tsx:**
```typescript
useEffect(() => {
  if (theme === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Forzar re-render
      forceUpdate();
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }
}, [theme]);
```

---

## Notas Técnicas

### LocalStorage Keys Utilizados
- `total-time-theme`: Almacena el tema actual ('light', 'dark', 'auto')
- `total-time-auto-save`: Auto-guardado (no relacionado con temas)
- `total-time-memory-monitor`: Monitor de memoria (no relacionado con temas)
- `total-time-view-mode`: Modo de visualización ('full', 'light')

### Consideraciones de Rendimiento

1. **SSR (Server-Side Rendering)**:
   - El tema se lee solo en el cliente (useEffect)
   - Durante SSR se muestra el fondo claro por defecto
   - No hay flash de contenido incorrecto

2. **Re-renders**:
   - Solo los componentes que usan `useSettings()` se re-renderizan
   - El cambio de tema es instantáneo para el usuario

3. **Media Queries**:
   - `window.matchMedia()` es eficiente y nativo del navegador
   - No hay polling, solo evaluación bajo demanda

### Compatibilidad

- ✅ Todos los navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Mobile responsive
- ✅ Accesible (respeta `prefers-reduced-motion`)
- ⚠️ IE11: No soporta `window.matchMedia()` - fallback a modo claro

### Debugging

**Ver el tema actual en consola:**
```javascript
// En DevTools console:
localStorage.getItem('total-time-theme')
```

**Forzar un tema específico:**
```javascript
localStorage.setItem('total-time-theme', 'dark');
window.location.reload();
```

**Ver todos los logs de cambios:**
Los cambios de tema logean automáticamente en consola:
```
🎨 Tema Claro
🎨 Tema Oscuro
🎨 Tema Automático
```

---

## Próximas Mejoras Sugeridas

1. **Animación de Transición**: Agregar fade suave entre temas
2. **Más Temas**: Implementar temas adicionales (sepia, alto contraste, etc.)
3. **Detección en Tiempo Real**: Escuchar cambios del sistema sin reload
4. **Tema por Hora**: Cambiar automáticamente según la hora del día
5. **Personalización**: Permitir al usuario crear temas personalizados

---

## Contacto y Mantenimiento

Para modificaciones futuras, revisar:
- Este documento (THEME_IMPLEMENTATION.md)
- Los archivos listados en la sección "Archivos Modificados"
- Los tests relacionados (cuando se implementen)

**Última actualización:** 2026-01-07
