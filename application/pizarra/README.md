# Pizarra - Arquitectura Modular

## 📁 Estructura del Proyecto

```
/pizarra
├── pizarra.tsx                    # Componente principal (290 líneas)
├── pizarra-old.tsx.backup         # Backup del código original (2272 líneas)
│
├── /types                         # Definiciones de tipos TypeScript
│   └── index.ts
│
├── /utils                         # Funciones utilitarias
│   ├── idGenerator.ts            # Generación de IDs únicos
│   ├── cardHelpers.ts            # Helpers para íconos y estilos
│   └── positionHelpers.ts        # Cálculos de posición y bordes
│
├── /hooks                         # Custom React Hooks
│   ├── useCardDrag.ts            # Lógica de arrastre de cards
│   ├── useCanvasPan.ts           # Navegación del canvas
│   ├── useConnections.ts         # Gestión de conexiones entre cards
│   ├── useCardResize.ts          # Redimensionamiento de cards
│   ├── usePasteImage.ts          # Pegar imágenes desde clipboard
│   └── useDropHandler.ts         # Drag & drop de recursos externos
│
└── /components
    ├── CardFactory.tsx            # Factory para renderizar diferentes tipos de cards
    ├── CardWrapper.tsx            # Wrapper con funcionalidad común (resize, config, etc.)
    │
    ├── /cards                     # Componentes individuales por tipo de card
    │   ├── ActivityCard.tsx
    │   ├── TodoCard.tsx
    │   ├── MisionCard.tsx
    │   ├── UsuarioCard.tsx
    │   ├── ProyectoCard.tsx
    │   ├── ImageCard.tsx
    │   └── GenericCard.tsx
    │
    └── /ui                        # Componentes UI reutilizables
        ├── ConnectionLines.tsx    # Renderizado de líneas de conexión
        ├── TodoInput.tsx         # Input para nuevas tareas
        ├── CardConfigPanel.tsx   # Panel de configuración de cards
        ├── DeleteConfirmModal.tsx # Modal de confirmación de eliminación
        └── ResizeHandles.tsx     # Manejadores de redimensionamiento
```

## 🎯 Mejoras Logradas

### Antes
- **2272 líneas** en un solo archivo
- Difícil de mantener y testear
- Componentes acoplados
- Lógica mezclada con UI

### Después
- **~290 líneas** en archivo principal
- Código organizado en **23 archivos** especializados
- Separación clara de responsabilidades
- Fácil de testear y extender

## 📊 Distribución de Código

| Categoría | Archivos | Líneas aprox. |
|-----------|----------|---------------|
| Types | 1 | 70 |
| Utils | 3 | 150 |
| Hooks | 6 | 400 |
| Components UI | 5 | 300 |
| Components Cards | 7 | 800 |
| Factory/Wrapper | 2 | 250 |
| Main | 1 | 290 |
| **Total** | **25** | **~2260** |

## 🔧 Cómo Usar

### Agregar un Nuevo Tipo de Card

1. Crear componente en `/components/cards/MiCard.tsx`
2. Agregar caso en `CardFactory.tsx`
3. (Opcional) Agregar estilos en `cardHelpers.ts`

### Agregar Nueva Funcionalidad

1. Si es lógica de estado → crear hook en `/hooks`
2. Si es UI reutilizable → crear componente en `/components/ui`
3. Si es utilidad → agregar en `/utils`

## 🧪 Testing

Cada componente y hook puede testearse de forma independiente:

```typescript
// Ejemplo: test de useCardDrag
import { renderHook } from '@testing-library/react-hooks';
import { useCardDrag } from './hooks/useCardDrag';

test('should handle card drag', () => {
  const { result } = renderHook(() => useCardDrag(...));
  // ... tests
});
```

## 📝 Notas

- **Backup disponible**: `pizarra-old.tsx.backup` contiene el código original
- **Performance**: React.memo aplicado en componentes clave
- **TypeScript**: Tipos estrictos en todos los archivos
- **Mantenibilidad**: Cada archivo tiene una única responsabilidad
