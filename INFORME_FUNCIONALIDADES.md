# 📊 Informe Detallado de Funcionalidades - Total Time

## 📋 Resumen Ejecutivo

**Total Time** es una aplicación web de gestión de tiempo y productividad construida con **Next.js 15**, **React 19**, **TypeScript** y **Supabase**. La aplicación ofrece un sistema completo de pizarras colaborativas, gestión de proyectos, misiones, actividades, comunicación en tiempo real y tracking de tiempo.

---

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico
- **Frontend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Estilos**: Tailwind CSS 4 + tailwindcss-animate
- **Estado**: React Context API + Custom Hooks (7 providers, 35+ hooks)
- **Autenticación**: Supabase Auth con protección de rutas
- **Iconos**: Lucide React
- **Node**: >= 22.0.0

### Estructura de Carpetas
```
├── app/                    # Rutas y páginas (Next.js App Router)
│   ├── contexts/           # Providers globales (Auth, Chat, Settings, etc.)
│   ├── components/         # Componentes de UI (41 archivos)
│   │   ├── mainUI/         # Componentes del dashboard principal
│   │   ├── organizacion/   # Componentes de organización
│   │   ├── modals/         # Diálogos modales
│   │   └── debug/          # Herramientas de debug (solo dev)
│   ├── dashboard/          # Dashboard admin/usuario
│   ├── login/              # Autenticación
│   ├── pizarra/[userId]/   # Pizarra personal de usuario
│   └── pizarra-organizacion/ # Pizarra compartida
├── application/            # Casos de uso y lógica de negocio
│   ├── pizarra/            # Motor de pizarra (35+ archivos)
│   ├── organizacion/       # CRUD organización
│   ├── proyecto/           # CRUD proyectos
│   ├── tareas/             # Gestión de tareas
│   └── user/               # Gestión de usuarios
├── domain/                 # Entidades puras del dominio (36 entidades)
│   ├── entities/           # Card, Mision, Proyecto, Usuario, etc.
│   └── enums/              # Enumeraciones
├── infrastructure/         # Capa de datos
│   ├── repositories/       # Interfaces de repositorios
│   └── datasource/         # Implementaciones Supabase (28+ repos)
├── hooks/                  # Custom React Hooks (35+)
├── components/             # Componentes compartidos (chat, notificaciones)
├── services/               # Servicios auxiliares
├── utils/                  # Utilidades (retry, queue, cache, monitoring)
├── supabase/               # Migraciones SQL
└── public/                 # Assets estáticos
```

---

## 🎯 Funcionalidades Principales

### 1. 🎨 Sistema de Pizarras

#### 1.1 Pizarra Personal
- **Descripción**: Pizarra individual de cada usuario para organizar su trabajo diario
- **Características**:
  - Renovación diaria automática (se limpia cada 24 horas)
  - Persistencia en Local Storage y Supabase
  - Guardado automático cada 3 segundos
  - Exportación/Importación en formato JSON
  - Historial de versiones guardadas
- **14 Tipos de Cards Soportados**:
  - 📝 **Notas** (`text`): Texto libre editable
  - ✅ **Listas TODO** (`todo`): Tareas con checkboxes y gestión de items
  - 🎯 **Misiones** (`mision`): Cards de misiones personales con horas, screenshots y estado
  - 🎯 **Misiones Org** (`mision-organizacion`): Misiones de organización con asignación de usuarios y TODOs vinculados
  - 📅 **Actividades** (`actividad`): Cards con tracking de tiempo y controles play/pause
  - 📅 **Actividades Org** (`actividad-organizacion`): Actividades de organización
  - 👤 **Usuarios** (`usuario`): Cards de contacto con avatar y estado online
  - 📁 **Proyectos** (`proyecto`): Cards de proyectos con notas y TODOs asociados
  - 📁 **Proyectos Org** (`proyecto-organizacion`): Proyectos de organización con edición y TODOs
  - 🖼️ **Imágenes** (`image`): Cards de imágenes (drag & drop, pegar desde clipboard, vista completa)
  - 📎 **Recursos** (`resource`): Cards de recursos externos con tipo e ícono
  - 🔧 **Genérico** (`generic`): Fallback para tipos desconocidos

#### 1.2 Pizarra de Organización
- **Descripción**: Pizarra compartida para toda la organización
- **Características**:
  - **Persistencia permanente** (no se borra diariamente)
  - **Sincronización en tiempo real** entre todos los usuarios
  - **Sistema de permisos**: Solo usuarios autorizados pueden editar
  - **Visualización para todos**: Todos los miembros pueden ver
  - Badges de estado: "Editor" o "Visualizador"
- **Permisos**:
  - Los administradores siempre pueden editar
  - Los permisos se otorgan individualmente por usuario
  - Sistema de auditoría (quién otorgó el permiso y cuándo)

#### 1.3 Funcionalidades de la Pizarra
- **Arrastrar y soltar**: Mover cards libremente por el canvas
- **Conexiones visuales**: Conectar cards con líneas para mostrar relaciones
- **Redimensionamiento**: Cambiar tamaño de cards dinámicamente
- **Pan y zoom**: Navegar por el canvas infinito
- **Configuración de cards**: Cambiar color, tamaño de fuente, etc.
- **Eliminación**: Eliminar cards con confirmación
- **Conexiones inteligentes**:
  - TODO ↔ Proyecto: Crea misiones automáticamente
  - TODO ↔ Misión: Vincula listas de tareas a misiones
  - Misión ↔ Proyecto: Asocia misiones a proyectos

---

### 2. 🎯 Sistema de Misiones

#### 2.1 Gestión de Misiones
- **Creación**: Modal completo con formulario
  - Nombre (requerido)
  - Descripción
  - Fechas de inicio y fin
  - Horas estimadas
  - Estado (pendiente, en progreso, completada, cancelada)
  - Asignación de usuario responsable
  - Vinculación a proyecto
- **Listas TODO asociadas**: Las misiones pueden tener múltiples listas de tareas
- **Estados**: Pendiente, En Progreso, Completada, Cancelada
- **Vista compacta**: Grid de misiones con información resumida
- **Detalles**: Modal con toda la información de la misión

#### 2.2 Misiones de Organización
- **Vista en dashboard**: Panel de misiones de la organización
- **Cards en pizarra**: Cards especiales `mision-organizacion` en la pizarra compartida
- **Sincronización**: Cambios reflejados en tiempo real
- **Filtrado**: Por usuario, proyecto, estado

---

### 3. 📅 Sistema de Actividades

#### 3.1 Tracking de Tiempo
- **Registro de actividades**: Descripción, fecha, hora de inicio
- **Duración estimada**: Horas planificadas
- **Tiempo dedicado**: Tiempo real trabajado (en minutos)
- **Capturas de pantalla**: Sistema automático de screenshots
  - Captura periódica durante la actividad
  - Almacenamiento en Supabase Storage
  - Visualización en galería
  - Eliminación por bloque de actividad
- **Enlaces**: Asociar URLs relevantes
- **Notas**: Campo de texto libre para observaciones

#### 3.2 Vista de Actividades
- **Grid compacto**: Vista de actividades recientes
- **Detalles**: Modal con toda la información
- **Filtrado**: Por fecha, proyecto, usuario
- **Historial**: Actividades pasadas organizadas por fecha

---

### 4. 📁 Sistema de Proyectos

#### 4.1 Gestión de Proyectos
- **Creación**: Modal con formulario completo
  - Nombre (requerido)
  - Descripción
  - Ícono (URL de imagen)
  - Asignación de usuarios
- **Notas asociadas**: Los proyectos pueden tener múltiples notas (cards de texto)
- **Misiones vinculadas**: Las misiones pueden asociarse a proyectos
- **Listado**: Panel lateral con todos los proyectos de la organización
- **Cards en pizarra**: Cards especiales `proyecto-organizacion`

#### 4.2 Proyectos de Organización
- **Vista compartida**: Todos los miembros pueden ver proyectos
- **Asignación de usuarios**: Múltiples usuarios por proyecto
- **Integración con pizarra**: Cards de proyecto en pizarra de organización

---

### 5. 💬 Sistema de Chat y Comunicación

#### 5.1 Chat en Tiempo Real
- **Chat 1 a 1**: Comunicación privada entre usuarios
- **Mensajes en tiempo real**: Sincronización instantánea vía Supabase Realtime
- **Ventana de chat**: Componente flotante, arrastrable y redimensionable
- **Indicadores de estado**: Usuario online/offline
- **Historial**: Mensajes persistentes en base de datos
- **Gestión de ventanas**: ChatWindowContext maneja múltiples ventanas con minimizar/maximizar

#### 5.2 Envío de Cards por Chat
- **Compartir cards**: Los usuarios pueden enviar cualquier tipo de card como mensaje de chat
- **Preview enriquecido**: `SharedCardPreview` muestra previsualizaciones específicas por tipo:
  - Misiones: Título, descripción, horas estimadas
  - TODOs: Lista de tareas con estado de completitud
  - Actividades: Asunto y duración
  - Proyectos: Ícono, nombre, descripción
  - Imágenes: Thumbnail de la imagen
  - Usuarios: Avatar del usuario
- **Badge de tipo**: Cada card compartido muestra un badge de color según su tipo
- **Agregar a pizarra**: El receptor puede agregar el card compartido a su pizarra con un solo click
- **Evento personalizado**: Sistema de custom events (`add-shared-card`) para comunicar con la pizarra

#### 5.3 Notificaciones
- **Mensajes entrantes**: Notificación cuando se recibe un mensaje
- **Apertura automática**: La ventana de chat se abre automáticamente
- **Badges**: Contadores de mensajes no leídos
- **Posts nuevos**: Badge con cantidad de posts no vistos por sala

---

### 6. 🏢 Sistema de Organizaciones

#### 6.1 Gestión de Organizaciones
- **Creación**: Los usuarios pueden crear organizaciones
- **Miembros**: Sistema de usuarios por organización
- **Información**: Nombre, descripción, imagen de perfil
- **Administradores**: Usuarios con rol de admin

#### 6.2 Usuarios de Organización
- **Listado**: Todos los miembros de la organización
- **Presencia**: Indicadores de usuarios online/offline
- **Perfiles**: Información de cada usuario
- **Avatar cúbico**: Visualización 3D de usuarios online

---

### 7. 🏠 Sistema de Salas

#### 7.1 Salas Virtuales
- **Tipos de salas**:
  - **Escritorio**: Trabajo individual
  - **Herramientas**: Recursos y herramientas
  - **Novedades**: Anuncios y actualizaciones
  - **Reglas**: Normas y políticas
- **Posts**: Sistema de publicaciones en cada sala
- **Comentarios**: Los usuarios pueden comentar posts
- **Notificaciones**: Badge con cantidad de posts no vistos
- **Navegación**: Scroll horizontal entre salas

#### 7.2 Posts y Comentarios
- **Creación de posts**: Texto, imágenes, enlaces
- **Comentarios**: Sistema de comentarios en posts
- **Marcado como visto**: Sistema de visualización de posts
- **Filtrado**: Por sala, usuario, fecha

---

### 8. 📚 Sistema de Recursos

#### 8.1 Gestión de Recursos
- **Tipos de recursos**:
  - Enlaces (links)
  - Código
  - Imágenes
  - Videos
  - Archivos para descargar
- **Creación**: Modal para agregar nuevos recursos
  - Nombre
  - Tipo
  - URL/Enlace
  - Descripción
  - Ícono
- **Organización**: Acordeón con recursos agrupados
- **Acceso rápido**: Desde panel lateral

---

### 9. ⏱️ Tracking y Analíticas

#### 9.1 Historial de Pizarras
- **Snapshots diarios**: Guardado automático de versiones de la pizarra
- **Visualización**: Gráfico de barras con últimos 5 días
- **Detalles**: Click en barra para ver elementos guardados
- **Restauración**: Cargar versiones anteriores de la pizarra
- **Resumen**: Cantidad de elementos por tipo (notas, tareas, actividades, etc.)

#### 9.2 Tracking de Sesiones
- **Sesiones de trabajo**: Registro de tiempo de trabajo
- **Intervalos**: Tracking por intervalos de tiempo
- **Reportes**: Visualización de tiempo dedicado

---

### 10. 👤 Gestión de Usuarios y Perfiles

#### 10.1 Perfiles de Usuario
- **Información personal**: Nombre, username, email, avatar
- **Configuración**: Preferencias del usuario
- **Organización**: Asociación a organización
- **Rol**: Admin o usuario regular

#### 10.2 Autenticación
- **Login**: Sistema de autenticación con Supabase
- **Registro**: Creación de nuevas cuentas
- **Confirmación**: Verificación de email
- **Protección de rutas**: Componente `ProtectedRoute`
- **Contexto de autenticación**: `AuthContext` para estado global

---

### 11. 🎨 Interfaz de Usuario

#### 11.1 Componentes Principales
- **Ventanas flotantes**: Sistema de ventanas redimensionables y movibles
  - Maximizar/Minimizar
  - Cerrar
  - Redimensionar
  - Overlay opcional
- **Paneles laterales**: Acordeón con recursos, proyectos, usuarios
- **Input Area**: Área de entrada para crear notas, tareas o enviar mensajes
- **Reloj actual**: Muestra hora actual
- **Perfil**: Panel de control del usuario con acciones de pizarra

#### 11.2 Modos de Visualización
- **Modo claro**: Fondo con gradientes claros (rosa → azul)
- **Modo oscuro**: Fondo con gradientes oscuros (azul noche profundo)
- **Modo automático**: Detecta preferencia del sistema operativo (`prefers-color-scheme`)
- **Persistencia de tema**: Se guarda en localStorage (`total-time-theme`)
- **Modo completo**: Pizarra a pantalla completa
- **Modo compacto**: Vista reducida de elementos

#### 11.3 Sistema de Toast Notifications
- **Tipos**: success (verde), error (rojo), info (azul), warning (amarillo)
- **Auto-dismiss**: Configurable (default 3 segundos)
- **Context-Based**: `ToastContext` con métodos `success()`, `error()`, `info()`, `warning()`
- **Animaciones**: Entrada slide-down, salida fade-out
- **Stacked**: Múltiples toasts apilados verticalmente
- **Portal-Based**: Renderizado fuera del árbol de componentes

---

### 12. 🔄 Sincronización en Tiempo Real

#### 12.1 Supabase Realtime
- **Cards**: Cambios en cards se reflejan instantáneamente
- **Conexiones**: Nuevas conexiones aparecen en tiempo real
- **Mensajes**: Chat sincronizado
- **Presencia**: Estado online/offline de usuarios
- **Posts**: Nuevos posts en salas aparecen inmediatamente

#### 12.2 Persistencia
- **Local Storage**: Cache local para rendimiento
- **Supabase**: Base de datos como fuente de verdad
- **Sincronización**: Merge automático entre local y remoto

---

### 13. 📤 Carga y Almacenamiento de Archivos

#### 13.1 Upload de Archivos
- **Screenshots**: Capturas de pantalla automáticas
- **Imágenes**: Subida de imágenes a Supabase Storage
- **Entregables**: Sistema de entrega de archivos
- **URLs**: Almacenamiento de URLs de recursos externos

---

### 14. 🎯 Dashboard

#### 14.1 Dashboard de Administrador
- **Pizarra de organización**: Canvas principal con drag & drop de cards
- **Panel izquierdo**: Listado de proyectos con botón de crear organización, browser de proyectos, acordeón colapsable
- **Panel derecho (AccordionAdmin)**: Listas de misiones, actividades, usuarios y recursos con filtrado y opciones de creación
- **Input Area inferior**: Entrada universal para crear notas, listas TODO o enviar mensajes a usuarios
- **Botones flotantes**: "Nuevo Ticket" (crear misión) y "Crear Actividad"
- **Chat integrado**: Ventanas flotantes y arrastrables
- **Modales de creación**: Misiones con nombre, descripción, fechas, horas, estado, proyecto; Actividades con descripción, fecha, hora, duración, enlace, usuario; Proyectos con nombre, descripción, ícono, usuarios
- **Calendario semanal**: Visualización de tiempo trabajado por día para cualquier usuario
- **Screenshots**: Visualización de capturas de pantalla de misiones activas
- **Edición de proyectos**: Modal de edición directa desde el dashboard
- **Conexiones automáticas**: Detección de relaciones TODO↔Proyecto, TODO↔Misión, Misión↔Proyecto
- **Toast notifications**: Feedback visual para acciones del usuario

#### 14.2 Dashboard de Usuario
- **Vista `DashboardUsuario`**: Dashboard personal simplificado
- **Pizarra personal**: Acceso a la pizarra propia
- **Acceso limitado**: Solo funcionalidades permitidas según rol

---

### 15. 🔗 Sistema de Auto-Conexiones

#### 15.1 Auto-Conexión de Cards
- **Misión → Proyecto**: Al agregar una misión a la pizarra, se conecta automáticamente con su proyecto asignado si ambos están presentes
- **Proyecto → Misiones**: Al agregar un proyecto, se conecta automáticamente con todas sus misiones ya presentes
- **ID de conexión**: Formato `auto-{misionId}-{proyectoId}` para evitar duplicados
- **Tracking**: Set interno rastrea conexiones automáticas para limpieza

#### 15.2 Sincronización TODO-Misión
- Hook `useTodoMisionSync` sincroniza listas de tareas con misiones
- Los cambios en TODOs se reflejan en el estado de la misión
- Las conexiones TODO↔Misión crean vínculos bidireccionales

---

### 16. 📱 Sistema de Card Sync (Carga Progresiva)

#### 16.1 Carga Progresiva de Datos
- **Loading básico**: Cards se muestran inmediatamente con datos mínimos
- **Enriquecimiento**: Datos adicionales se cargan en background por tipo:
  - Misiones: Detalles, usuario asignado, estado de ejecución
  - Actividades: Metadata, información del participante
  - Usuarios: Perfil e historial de mensajes
  - TODOs: Items y estado de completitud
  - Imágenes: URL y estado de pasted images
  - Proyectos: Detalles, relaciones, metadata

#### 16.2 Sistema de Cache por Día
- Cache en localStorage por card y día: `pizarra-{prefix}-card-data-{cardId}-v1`
- Validación automática contra fecha actual
- Callback `onCardReady` para actualizaciones progresivas de UI

#### 16.3 Lógica de Decisión de Sync
- Pizarra propia + no inicializada → Siempre sync desde Supabase
- Pizarra propia + inicializada → Solo sync si local está vacío
- Pizarra compartida → Siempre sync desde Supabase

---

### 17. ⏱️ Tracking de Sesiones de Trabajo

#### 17.1 useSimpleTracking (Usuario Actual)
- **Tiempo Hoy**: Suma de minutos de capturas creadas hoy (5 min por captura)
- **Última Actividad**: Tiempo dedicado a la última misión/actividad del día
- **Tiempo Semana**: Suma de minutos de capturas de la semana
- Actualizaciones en tiempo real vía suscripciones Supabase

#### 17.2 useSesionesTracking (Local)
- Tracking de sesiones en localStorage
- Estructura: ID, misión, tipo (misión/actividad), inicio, fin, duración
- Métodos: `iniciarSesion()`, `finalizarSesion()`, `calcularEstadísticas()`, `limpiarSesionesAntiguas()`
- Sincronización entre componentes vía custom events

#### 17.3 useUserTracking (Para Admins)
- Tracking accesible para administradores sobre cualquier usuario
- Mismas métricas que `useSimpleTracking` pero parametrizado por userId
- Suscripciones Realtime filtradas por usuario

---

### 18. 📅 Calendario Semanal

#### 18.1 CalendarioSemanalUsuario
- Muestra horario de trabajo de la semana actual (Lunes-Domingo)
- Tiempo trabajado por día calculado desde capturas
- Total de horas de la semana
- Capturas agrupadas por día con colores pastel (7 colores distintos)
- Historial de capturas con timestamps
- Feature de admin: Se abre en modal grande (1800x1000px) desde el dashboard

---

## 🔧 Funcionalidades Técnicas Detalladas

### 1. 🏗️ Arquitectura y Patrones de Diseño

#### 1.1 Arquitectura Hexagonal (Clean Architecture)
- **Separación de capas**:
  - **Domain**: Entidades puras y enums (36 entidades)
  - **Application**: Casos de uso y lógica de negocio
  - **Infrastructure**: Repositorios y servicios (Supabase)
  - **Presentation**: Componentes React y hooks
- **Inversión de dependencias**: Interfaces en domain, implementaciones en infrastructure
- **Testabilidad**: Cada capa puede testearse independientemente

#### 1.2 Patrones Implementados
- **Repository Pattern**: Abstracción de acceso a datos (40+ repositorios con interfaces + implementaciones)
- **Factory Pattern**: `CardFactory` para crear diferentes tipos de cards (14 tipos)
- **Observer Pattern**: Supabase Realtime para sincronización en tiempo real
- **Strategy Pattern**: Diferentes estrategias de guardado (localStorage vs Supabase)
- **Context Pattern**: 7 providers globales (Auth, Chat, Proyectos, Recursos, Settings, Usuarios, Toast)
- **Progressive Loading**: Card sync con carga básica inmediata y enriquecimiento en background
- **Custom Events**: Comunicación entre componentes desacoplados (`add-shared-card`, sesiones tracking)

---

### 2. ⚡ Optimizaciones de Rendimiento

#### 2.1 Gestión de Memoria

**Monitor de Memoria en Tiempo Real**
- Widget visual en desarrollo que muestra:
  - Uso actual de memoria (MB)
  - Porcentaje de uso del heap
  - Historial gráfico
  - Alertas automáticas (>70% alto, >90% crítico)
- Utilidades de consola:
  ```javascript
  window.__performanceUtils.logMemoryInfo()
  window.__performanceUtils.startMemoryMonitoring(5000)
  window.__performanceUtils.analyzePerformance()
  ```

**Prevención de Memory Leaks**
- **Limpieza de suscripciones Supabase**: Todos los hooks limpian canales correctamente
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('...').subscribe()
    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel) // ✅ Limpieza completa
    }
  }, [dependencies])
  ```
- **Limpieza de Canvas**: Canvas y blobs se limpian explícitamente después de capturas
- **Limpieza de Event Listeners**: Todos los listeners se remueven en cleanup
- **Límites de datos**: Historial de mensajes limitado, localStorage con limpieza automática

**Gestión de LocalStorage**
- **Validación de JSON**: Parsing seguro con fallbacks
- **Limpieza automática**: Historial limitado a 30 días
- **Renovación diaria**: Pizarras personales se renuevan cada 24h (excepto pizarras de organización)
- **Snapshots históricos**: Guardado automático antes de limpiar

#### 2.2 Optimización de Requests

**Cola de Requests (Request Queue)**
- **Control de concurrencia**: Máximo 2 requests simultáneos
- **Intervalo mínimo**: 500ms entre requests para evitar rate limiting
- **Sistema de prioridades**: Requests prioritarios se procesan primero
- **Implementación**: `utils/requestQueue.ts`
  ```typescript
  await queueSupabaseOperation(
    () => supabase.from('table').insert(data),
    'operation-name',
    priority
  )
  ```

**Retry con Exponential Backoff**
- **Reintentos automáticos**: Hasta 3 intentos con delays crecientes
- **Manejo de rate limiting**: Delays más largos para errores 429
- **Configuración flexible**: Base delay, max delay personalizables
- **Implementación**: `utils/retryWithBackoff.ts`
  ```typescript
  await retrySupabaseOperation(
    () => supabaseOperation(),
    'operation-name'
  )
  ```

#### 2.3 Optimización de React

**Memoización Agresiva**
- **React.memo**: Componentes de cards memoizados
- **useMemo**: Cálculos costosos memoizados (filtros, transformaciones)
- **useCallback**: Funciones pasadas como props estabilizadas
- **Ejemplo**: Cards de pizarra solo se re-renderizan cuando cambian sus props

**Lazy Loading**
- **Code splitting**: Componentes pesados cargados bajo demanda
- **Suspense**: Loading states durante carga diferida
- **Reducción de bundle inicial**: Mejor tiempo de carga

**Virtualización** (Recomendado para futuras implementaciones)
- Listas largas de mensajes/posts pueden virtualizarse
- Reducción de nodos DOM renderizados

#### 2.4 Optimización de Red

**Debounce en Guardado**
- Guardado automático después de 3 segundos de inactividad
- Evita múltiples requests innecesarios
- Implementado en `usePizarraLocalStorage.ts`

**Cache Inteligente**
- **LocalStorage como cache**: Datos frecuentes en cliente
- **Supabase como fuente de verdad**: Sincronización cuando es necesario
- **Merge automático**: Resolución de conflictos entre local y remoto

---

### 3. 🔒 Seguridad

#### 3.1 Row Level Security (RLS) en Supabase

**Políticas Implementadas**

**Pizarra de Organización:**
- ✅ **SELECT**: Todos los miembros pueden ver la pizarra de su organización
- ✅ **UPDATE**: Solo usuarios con permiso explícito o admins pueden editar
- ✅ **INSERT**: Solo admins pueden crear pizarras de organización

**Cards de Organización:**
- ✅ **SELECT**: Miembros pueden ver cards de su organización
- ✅ **ALL**: Solo usuarios con permiso o admins pueden modificar

**Permisos:**
- ✅ **SELECT**: Usuarios pueden ver sus propios permisos
- ✅ **ALL**: Solo admins pueden gestionar permisos

**Ejemplo de Política RLS:**
```sql
CREATE POLICY "Usuarios con permiso pueden editar pizarra"
  ON pizarra_organizacion FOR UPDATE
  USING (
    id_organizacion IN (
      SELECT pop.id_organizacion
      FROM pizarra_organizacion_permisos pop
      INNER JOIN usuario u ON u.id = pop.id_usuario
      WHERE u.user_auth = auth.uid()
        AND pop.puede_editar = true
    )
    OR
    -- O es el admin de la organización
    id_organizacion IN (
      SELECT o.id FROM organizacion o
      WHERE o.idAdmin = auth.uid()
    )
  );
```

#### 3.2 Autenticación y Autorización

**Sistema de Autenticación**
- **Supabase Auth**: Autenticación robusta con JWT
- **Protección de rutas**: Componente `ProtectedRoute`
- **Contexto global**: `AuthContext` para estado de autenticación
- **Verificación de sesión**: Validación automática en cada request

**Control de Acceso**
- **Roles**: Admin vs Usuario regular
- **Permisos granulares**: Sistema de permisos por funcionalidad
- **Validación en cliente y servidor**: Doble verificación de permisos

#### 3.3 Validación de Datos

**Validación en Cliente**
- **TypeScript**: Tipado estricto previene errores
- **Validación de formularios**: Campos requeridos, formatos correctos
- **Sanitización**: Limpieza de inputs antes de enviar

**Validación en Servidor**
- **Constraints de BD**: Foreign keys, unique constraints
- **Triggers**: Validaciones automáticas en PostgreSQL
- **RLS**: Políticas adicionales de seguridad

#### 3.4 Seguridad de Canales Realtime

**Monitoreo de Canales**
- **Tracking de canales activos**: `utils/supabaseChannelMonitor.ts`
- **Detección de leaks**: Alerta si hay >10 canales activos
- **Limpieza forzada**: Utilidad para limpiar canales huérfanos
- **Registro de componentes**: Cada canal registra su componente origen

**Utilidades de Debug:**
```javascript
window.__supabaseChannels.getActive()      // Lista canales activos
window.__supabaseChannels.getCount()       // Cuenta canales
window.__supabaseChannels.detectOrphans()  // Detecta leaks
window.__supabaseChannels.forceCleanup()  // Limpia todo
```

---

### 4. 🔍 Monitoreo y Debugging

#### 4.1 Monitoreo de Performance

**Performance Monitor** (`utils/performanceMonitor.ts`)
- **Información de memoria**: Uso actual, total, límite, porcentaje
- **Análisis de DOM**: Conteo de nodos DOM
- **Navigation Timing**: Tiempos de carga de página
- **Event Listeners**: Conteo aproximado de listeners

**Métricas Monitoreadas:**
- ✅ Memoria usada (MB)
- ✅ Porcentaje de heap usado
- ✅ Nodos DOM
- ✅ Tiempos de carga
- ✅ Event listeners

#### 4.2 Tracking de Llamadas

**Auth Call Tracker** (`utils/authCallTracker.ts`)
- **Rastreo de llamadas**: Registro de todas las llamadas de autenticación
- **Detección de excesos**: Alerta si >5 llamadas en 5 segundos
- **Stack traces**: Identificación de origen de llamadas
- **Resumen periódico**: Log cada 30 segundos en desarrollo

**Request Queue Monitor**
- **Longitud de cola**: Monitoreo de requests pendientes
- **Tiempo de procesamiento**: Tracking de delays
- **Errores**: Registro de fallos

#### 4.3 Debugging Tools

**Utilidades Globales** (solo en desarrollo):
```javascript
// Performance
window.__performanceUtils.analyzePerformance()
window.__performanceUtils.startMemoryMonitoring(5000)

// Canales Supabase
window.__supabaseChannels.logStatus()
window.__supabaseChannels.detectOrphans()

// Auth calls
authCallTracker.logSummary()
```

**Componente de Debug**
- **MemoryMonitorWrapper**: Widget visual de memoria (solo desarrollo)
- **Componentes de debug**: `app/components/debug/` para testing

---

### 5. 🛡️ Manejo de Errores

#### 5.1 Estrategias de Retry

**Retry con Exponential Backoff**
- **Máximo 3 reintentos**: Configurable
- **Delays progresivos**: 1s → 2s → 4s (base)
- **Manejo especial de rate limits**: Delays más largos para 429
- **Logging**: Registro de cada intento

#### 5.2 Validación y Sanitización

**Validación de JSON**
- **Parsing seguro**: Try-catch con fallbacks
- **Validación de estructura**: Verificación de formato antes de parsear
- **Limpieza de datos corruptos**: Eliminación automática de datos inválidos

**Validación de Fechas**
- **Comparación segura**: Manejo de fechas en localStorage
- **Renovación diaria**: Verificación de cambio de día
- **Snapshots históricos**: Guardado antes de limpiar

#### 5.3 Manejo de Errores de Red

**Queue de Requests**
- **Evita sobrecarga**: Limita requests simultáneos
- **Reintentos automáticos**: Integrado con retry logic
- **Priorización**: Requests críticos primero

---

### 6. 📊 Optimizaciones Específicas

#### 6.1 Pizarra

**Guardado Optimizado**
- **Debounce**: Solo guarda después de 3s de inactividad
- **Batch updates**: Múltiples cambios se agrupan
- **Detección de cambios**: Solo guarda si hay cambios reales

**Renderizado Optimizado**
- **Canvas virtual**: Solo renderiza cards visibles (futuro)
- **Memoización de cards**: Cards memoizados individualmente
- **Lazy loading de imágenes**: Carga diferida de imágenes grandes

#### 6.2 Chat

**Límite de Mensajes**
- **Paginación**: Carga mensajes en lotes
- **Límite en memoria**: Solo últimos 100 mensajes (recomendado)
- **Limpieza automática**: Mensajes antiguos se eliminan

**Suscripciones Optimizadas**
- **Un canal por conversación**: Nombres únicos evitan duplicados
- **Cleanup garantizado**: Siempre se limpian al desmontar
- **Reconexión automática**: Manejo de desconexiones

#### 6.3 LocalStorage

**Gestión Inteligente**
- **Versiones**: Keys versionadas (`-v1`) para migraciones
- **Limpieza automática**: Historial limitado a 30 días
- **Validación**: Verificación de integridad antes de usar
- **Fallbacks**: Valores por defecto si datos corruptos

---

### 7. 🔄 Sincronización y Consistencia

#### 7.1 Estrategia de Sincronización

**Multi-Fuente de Datos**
1. **LocalStorage**: Cache rápido, offline-first
2. **Supabase**: Fuente de verdad, persistencia permanente
3. **Realtime**: Sincronización instantánea entre usuarios

**Resolución de Conflictos**
- **Last-write-wins**: Último cambio gana (con timestamps)
- **Merge inteligente**: Combinación de cambios cuando es posible
- **Notificaciones**: Usuario informado de conflictos

#### 7.2 Consistencia de Datos

**Transacciones**
- **Operaciones atómicas**: Múltiples cambios en una transacción
- **Rollback automático**: En caso de error, se revierten cambios
- **Verificación**: Validación antes de commit

**Índices de Base de Datos**
- **Índices optimizados**: Búsquedas rápidas
- **Foreign keys**: Integridad referencial
- **Unique constraints**: Prevención de duplicados

---

### 8. 📈 Métricas y Benchmarks

#### 8.1 Métricas de Performance Esperadas

**Memoria Normal (App Saludable)**
- Página vacía: 30-50 MB
- Después de login: 60-100 MB
- Con 5 cards en pizarra: 80-120 MB
- Con 3 chats abiertos: 100-150 MB
- Después de 30 min uso: 120-180 MB

**Nodos DOM**
- Normal: < 3,000 nodos
- Alto: 3,000-5,000 nodos
- Crítico: > 5,000 nodos

**Tiempos de Carga**
- Carga inicial: < 3 segundos
- Navegación: < 500ms
- Guardado: < 1 segundo

#### 8.2 Señales de Alerta

**⚠️ Requiere Atención**
- Memoria: 150-300 MB
- Nodos DOM: 3,000-5,000
- Carga inicial: 3-5 segundos

**🚨 Crítico**
- Memoria: > 300 MB y creciendo
- Nodos DOM: > 5,000
- Carga inicial: > 5 segundos
- Memory leak evidente

---

### 9. 🧪 Testing y Calidad

#### 9.1 Estrategias de Testing

**Testing Unitario** (Recomendado)
- Hooks aislados
- Utilidades puras
- Repositorios mockeados

**Testing de Integración**
- Flujos completos
- Sincronización realtime
- Persistencia

**Testing Manual**
- Escenarios críticos documentados
- Checklist de funcionalidades
- Pruebas de carga

#### 9.2 Calidad de Código

**TypeScript Estricto**
- Tipado completo
- Sin `any` innecesarios
- Interfaces bien definidas

**ESLint**
- Reglas estrictas
- Auto-fix disponible
- Pre-commit hooks (recomendado)

**Estructura Modular**
- Separación de responsabilidades
- Código reutilizable
- Fácil mantenimiento

---

### 10. 🚀 Mejoras Futuras Identificadas

#### 10.1 Optimizaciones Pendientes

**Virtualización de Listas**
- Implementar `react-window` para listas largas
- Reducir nodos DOM renderizados

**Service Workers**
- Cache de assets
- Offline support
- Background sync

**Code Splitting Avanzado**
- Route-based splitting
- Component-based splitting
- Dynamic imports

#### 10.2 Monitoreo en Producción

**Analytics**
- Tracking de errores (Sentry)
- Performance monitoring
- User analytics

**Logging**
- Structured logging
- Error tracking
- Performance metrics

---

## 📊 Resumen de Funcionalidades Técnicas

### Implementado ✅
- ✅ Arquitectura hexagonal modular
- ✅ Sistema de cola de requests
- ✅ Retry con exponential backoff
- ✅ Monitoreo de memoria en tiempo real
- ✅ RLS completo en Supabase
- ✅ Limpieza automática de recursos
- ✅ Validación y sanitización
- ✅ Cache inteligente (localStorage + Supabase)
- ✅ Tracking de canales y auth calls
- ✅ Optimización de React (memo, lazy loading)
- ✅ Sistema de temas claro/oscuro/automático
- ✅ Envío de cards por chat con preview enriquecido
- ✅ Auto-conexión entre cards (misión↔proyecto)
- ✅ Carga progresiva de datos de cards con cache por día
- ✅ Toast notification system (success, error, info, warning)
- ✅ Tracking de sesiones de trabajo (local + Supabase)
- ✅ Calendario semanal de tiempo trabajado
- ✅ Sistema de permisos de pizarra con solicitud/aprobación
- ✅ Pegar imágenes desde clipboard (Ctrl+V)

### Recomendado para Futuro 🔜
- 🔜 Virtualización de listas
- 🔜 Service workers
- 🔜 Analytics y error tracking (Sentry)
- 🔜 Testing automatizado
- 🔜 Performance budgets
- 🔜 Bundle analysis

---

## 📊 Estadísticas del Proyecto

### Estructura de Código
- **Rutas/Páginas**: 11 rutas (App Router)
- **Pizarra**: 35+ archivos modulares (components, hooks, utils, functions, contexts)
- **Hooks**: 35+ hooks personalizados
- **Entidades**: 36 entidades de dominio
- **Repositorios**: 40+ repositorios (interfaces + implementaciones Supabase)
- **Componentes**: 90+ componentes React
- **Context Providers**: 7 providers globales

### Tipos de Cards
- 14 tipos diferentes de cards en la pizarra
- Sistema extensible: agregar componente en `/cards`, registrar en `CardFactory.tsx`

### Context Providers
| Provider | Propósito |
|----------|-----------|
| `AuthContext` | Estado de autenticación, perfil de usuario, presencia online |
| `ChatWindowContext` | Gestión de ventanas de chat flotantes (abrir, cerrar, minimizar, posición) |
| `ProyectosContext` | Estado de proyectos de la organización |
| `RecursosContext` | Estado de recursos |
| `SettingsContext` | Preferencias del usuario (tema, auto-save, monitor de memoria, modo de vista) |
| `UsuariosOrganizacionContext` | Lista de miembros de la organización |
| `ToastContext` | Sistema de notificaciones toast |

### Integraciones
- **Supabase**: Base de datos, autenticación, storage, realtime
- **Lucide React**: Iconos
- **Tailwind CSS 4**: Estilos con animaciones
- **@anthropic-ai/sdk**: Integración con Claude AI

---

## 🚀 Funcionalidades Futuras (Identificadas)

### Mejoras Planificadas
- Panel de administración de permisos de pizarra
- Notificaciones push
- Exportación de reportes
- Integración con calendarios
- API pública
- Aplicación móvil

---

## 📝 Notas Finales

Este proyecto es una **plataforma completa de gestión de tiempo y productividad** con énfasis en:
- **Colaboración en tiempo real**
- **Flexibilidad** (pizarras personalizables)
- **Tracking detallado** de tiempo y actividades
- **Comunicación integrada** (chat con card sharing, salas con posts, notificaciones)
- **Organización** (proyectos, misiones, recursos)
- **Carga progresiva** (card sync con cache inteligente)

La arquitectura modular y el uso de TypeScript garantizan **mantenibilidad** y **escalabilidad** del código.

---

## 📚 Documentación Relacionada

| Documento | Descripción |
|-----------|-------------|
| [README.md](./README.md) | Visión general del proyecto, setup y estructura |
| [AGENTS.md](./AGENTS.md) | Guías de estilo, estructura y convenciones |
| [PIZARRA_ORGANIZACION_README.md](./PIZARRA_ORGANIZACION_README.md) | Sistema de pizarra compartida con permisos y RLS |
| [PROYECTO_NOTAS_README.md](./PROYECTO_NOTAS_README.md) | Sistema de notas en cards de proyecto |
| [docs/PIZARRA_TEAMMATE_MODULE.md](./docs/PIZARRA_TEAMMATE_MODULE.md) | Módulo de visualización de pizarras de compañeros |
| [docs/THEME_IMPLEMENTATION.md](./docs/THEME_IMPLEMENTATION.md) | Implementación del sistema de temas claro/oscuro |
| [application/pizarra/README.md](./application/pizarra/README.md) | Arquitectura modular del motor de pizarra |

---

**Versión del Informe**: 2.0
**Última actualización**: Febrero 2026
**Proyecto**: Total Time

