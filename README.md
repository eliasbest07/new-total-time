# Total Time

Plataforma web de gestion de tiempo, productividad y colaboracion en tiempo real para equipos y organizaciones. Construida con Next.js, React, TypeScript y Supabase.

## Stack Tecnologico

- **Frontend**: Next.js 16 (App Router + Turbopack), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Estilos**: Tailwind CSS 4 + tailwindcss-animate
- **Estado**: React Context API + Custom Hooks
- **Iconos**: Lucide React

## Inicio Rapido

```bash
# Instalar dependencias (requiere Node >= 22)
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus claves de Supabase:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripcion |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de produccion |
| `npm start` | Iniciar build de produccion |
| `npm run lint` | Ejecutar ESLint |

## Estructura del Proyecto

```
├── app/                    # Rutas y paginas (Next.js App Router)
│   ├── contexts/           # Providers globales (Auth, Chat, Settings, etc.)
│   ├── components/         # Componentes de UI (41 archivos)
│   │   ├── mainUI/         # Componentes del dashboard principal
│   │   ├── organizacion/   # Componentes de organizacion
│   │   ├── modals/         # Dialogos modales
│   │   └── debug/          # Herramientas de debug (solo dev)
│   ├── dashboard/          # Dashboard admin/usuario
│   ├── login/              # Autenticacion
│   ├── pizarra/[userId]/   # Pizarra personal de usuario
│   └── pizarra-organizacion/ # Pizarra compartida
│
├── application/            # Casos de uso y logica de negocio
│   ├── pizarra/            # Motor de pizarra (35+ archivos)
│   │   ├── components/     # Cards, factory, wrapper
│   │   ├── hooks/          # Drag, pan, resize, paste, sync
│   │   ├── utils/          # Mapper, helpers, posicion
│   │   ├── pizarra-functions/ # Auto-conexion, sync, handlers
│   │   └── contexts/       # Toast context
│   ├── organizacion/       # CRUD organizacion
│   ├── proyecto/           # CRUD proyectos
│   ├── tareas/             # Gestion de tareas
│   ├── user/               # Gestion de usuarios
│   └── propuesta/          # Propuestas
│
├── domain/                 # Entidades puras del dominio (36 entidades)
│   ├── entities/           # Card, Mision, Proyecto, Usuario, etc.
│   └── enums/              # Enumeraciones
│
├── infrastructure/         # Capa de datos
│   ├── repositories/       # Interfaces de repositorios
│   └── datasource/         # Implementaciones Supabase (28+ repos)
│
├── hooks/                  # Custom React Hooks (35+)
├── components/             # Componentes compartidos (chat, notificaciones)
├── services/               # Servicios auxiliares
├── utils/                  # Utilidades (retry, queue, cache, monitoring)
├── supabase/               # Migraciones SQL
└── public/                 # Assets estaticos
```

## Funcionalidades Principales

### Pizarras (Canvas Interactivo)
- **Pizarra Personal**: Espacio individual con renovacion diaria, drag & drop, conexiones entre cards, pan/zoom infinito
- **Pizarra de Organizacion**: Espacio compartido con sincronizacion en tiempo real y control de permisos (editor/visualizador)
- **Pizarra de Companeros**: Ver y agregar elementos a pizarras de otros usuarios con sistema de solicitud de permisos
- **14+ tipos de cards**: Notas, TODOs, misiones, actividades, proyectos, imagenes, recursos, usuarios (versiones personales y de organizacion)
- **Conexiones inteligentes**: Auto-conexion entre misiones y proyectos, TODO-mision sync

### Gestion de Trabajo
- **Misiones/Tickets**: Creacion, asignacion, estados, horas estimadas, fechas, vinculacion a proyectos
- **Actividades**: Registro de tiempo con capturas de pantalla automaticas
- **Proyectos**: Agrupacion con usuarios asignados, notas asociadas, misiones vinculadas
- **Tareas/TODOs**: Listas de tareas con checkboxes, sincronizacion con misiones

### Comunicacion
- **Chat en tiempo real**: Mensajeria 1 a 1 con indicadores de presencia online/offline
- **Envio de cards por chat**: Compartir cualquier tipo de card como mensaje, el receptor puede agregarlo a su pizarra
- **Salas virtuales**: Escritorio, Herramientas, Novedades, Reglas con posts y comentarios
- **Notificaciones**: Badges de mensajes no leidos y posts nuevos

### Dashboard
- **Vista Admin**: Pizarra de organizacion + acordeon lateral con misiones, actividades, recursos y usuarios
- **Vista Usuario**: Dashboard personal simplificado
- **Calendario semanal**: Visualizacion de tiempo trabajado por dia
- **Tracking de tiempo**: Metricas de hoy, ultima actividad, semana

### Sistema
- **Autenticacion**: Supabase Auth con proteccion de rutas
- **Temas**: Modo claro, oscuro y automatico
- **Persistencia**: Local Storage como cache + Supabase como fuente de verdad
- **Auto-guardado**: Debounce de 3 segundos con sincronizacion automatica
- **Performance**: Cola de requests, retry con backoff, memoizacion, lazy loading

## Arquitectura

```
Usuario → Pagina (App Router) → Context Providers → Custom Hooks → Repositorios → Supabase
                                       ↓
                                 Local Storage (cache)
                                       ↓
                               Realtime subscriptions
```

Patron principal: **Entity → Repository Interface → Supabase Implementation → Hook → Component**

## Documentacion Adicional

| Documento | Descripcion |
|-----------|-------------|
| [INFORME_FUNCIONALIDADES.md](./INFORME_FUNCIONALIDADES.md) | Documentacion completa de todas las funcionalidades y detalles tecnicos |
| [AGENTS.md](./AGENTS.md) | Guias de estilo, estructura y convenciones del proyecto |
| [PIZARRA_ORGANIZACION_README.md](./PIZARRA_ORGANIZACION_README.md) | Sistema de pizarra compartida con permisos y RLS |
| [PROYECTO_NOTAS_README.md](./PROYECTO_NOTAS_README.md) | Sistema de notas asociadas a cards de proyecto |
| [docs/PIZARRA_TEAMMATE_MODULE.md](./docs/PIZARRA_TEAMMATE_MODULE.md) | Modulo de visualizacion de pizarras de companeros |
| [docs/THEME_IMPLEMENTATION.md](./docs/THEME_IMPLEMENTATION.md) | Implementacion del sistema de temas claro/oscuro |
| [application/pizarra/README.md](./application/pizarra/README.md) | Arquitectura modular del motor de pizarra |

## Variables de Entorno

| Variable | Descripcion |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anonima de Supabase |

## Base de Datos

Las migraciones SQL estan en `supabase/migrations/`. Tablas principales:
- `usuario`, `organizacion` - Usuarios y organizaciones
- `pizarras`, `cards`, `card_connections` - Pizarras personales
- `pizarra_organizacion`, `cards_organizacion`, `pizarra_organizacion_permisos` - Pizarras compartidas
- `misiones`, `actividades`, `proyectos`, `tareas` - Gestion de trabajo
- `mensajes`, `salas`, `posts`, `comentarios` - Comunicacion
- `recursos`, `captures`, `sesiones_trabajo` - Recursos y tracking
