# Componente Ventana Modal

Un componente de ventana modal completamente personalizable, reutilizable y funcional para React/Next.js con TypeScript.

## Características

- ✅ **Arrastrable**: Mueve la ventana arrastrando desde la barra de título
- ✅ **Redimensionable**: Cambia el tamaño desde la esquina inferior derecha
- ✅ **Minimizable**: Colapsa la ventana a solo la barra de título
- ✅ **Maximizable**: Expande la ventana a pantalla completa
- ✅ **Múltiples ventanas**: Soporte para múltiples ventanas simultáneas
- ✅ **Z-index automático**: Las ventanas se traen al frente automáticamente
- ✅ **Responsive**: Se adapta a diferentes tamaños de pantalla
- ✅ **Personalizable**: Estilos y comportamiento completamente configurables
- ✅ **Accesible**: Controles de ventana estándar (cerrar, minimizar, maximizar)

## Uso Básico

```tsx
import Ventana from './components/Ventana';

function MiComponente() {
  const [ventanaAbierta, setVentanaAbierta] = useState(false);

  return (
    <>
      <button onClick={() => setVentanaAbierta(true)}>
        Abrir Ventana
      </button>
      
      <Ventana
        isOpen={ventanaAbierta}
        onClose={() => setVentanaAbierta(false)}
        title="Mi Ventana"
        initialWidth={600}
        initialHeight={400}
      >
        <div>
          <h2>Contenido de la ventana</h2>
          <p>Cualquier contenido JSX puede ir aquí</p>
        </div>
      </Ventana>
    </>
  );
}
```

## Props del Componente

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `isOpen` | `boolean` | - | **Requerido**. Controla si la ventana está visible |
| `onClose` | `() => void` | - | **Requerido**. Función llamada al cerrar la ventana |
| `title` | `string` | - | **Requerido**. Título mostrado en la barra de la ventana |
| `children` | `ReactNode` | - | **Requerido**. Contenido de la ventana |
| `initialWidth` | `number` | `600` | Ancho inicial en píxeles |
| `initialHeight` | `number` | `400` | Alto inicial en píxeles |
| `initialX` | `number` | `100` | Posición X inicial |
| `initialY` | `number` | `100` | Posición Y inicial |
| `minWidth` | `number` | `300` | Ancho mínimo permitido |
| `minHeight` | `number` | `200` | Alto mínimo permitido |
| `resizable` | `boolean` | `true` | Permite redimensionar la ventana |
| `draggable` | `boolean` | `true` | Permite arrastrar la ventana |
| `className` | `string` | `''` | Clases CSS adicionales |

## Hook useVentanas

Para manejar múltiples ventanas fácilmente:

```tsx
import { useVentanas } from '../hooks/useVentanas';

function MiComponente() {
  const { ventanas, abrirVentana, cerrarVentana } = useVentanas();

  const abrirMiVentana = () => {
    abrirVentana({
      id: 'mi-ventana-unica',
      title: 'Mi Ventana',
      content: <div>Contenido aquí</div>,
      width: 500,
      height: 300
    });
  };

  return (
    <>
      <button onClick={abrirMiVentana}>Abrir Ventana</button>
      
      {ventanas.map((ventana) => (
        <Ventana
          key={ventana.id}
          isOpen={true}
          onClose={() => cerrarVentana(ventana.id)}
          title={ventana.title}
          initialWidth={ventana.width}
          initialHeight={ventana.height}
        >
          {ventana.content}
        </Ventana>
      ))}
    </>
  );
}
```

## Ejemplos de Uso

### Ventana de Formulario

```tsx
const abrirFormulario = () => {
  abrirVentana({
    id: 'formulario',
    title: 'Nuevo Usuario',
    content: (
      <form className="space-y-4">
        <input 
          type="text" 
          placeholder="Nombre"
          className="w-full p-2 rounded bg-white/10 text-white"
        />
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Guardar
        </button>
      </form>
    ),
    width: 400,
    height: 300
  });
};
```

### Ventana de Configuración

```tsx
const abrirConfiguracion = () => {
  abrirVentana({
    id: 'config',
    title: 'Configuración',
    content: <ConfiguracionComponent />,
    width: 600,
    height: 500,
    resizable: false // No redimensionable
  });
};
```

### Ventana de Solo Lectura

```tsx
const abrirInfo = () => {
  abrirVentana({
    id: 'info',
    title: 'Información',
    content: <InfoComponent />,
    width: 300,
    height: 200,
    draggable: false, // No arrastrable
    resizable: false  // No redimensionable
  });
};
```

## Personalización de Estilos

El componente usa Tailwind CSS y mantiene consistencia con el diseño del sistema. Puedes personalizar los estilos usando la prop `className`:

```tsx
<Ventana
  className="border-2 border-blue-500"
  // ... otras props
>
  {/* contenido */}
</Ventana>
```

## Controles de Ventana

- **Botón Rojo**: Cierra la ventana
- **Botón Amarillo**: Minimiza/restaura la ventana
- **Botón Verde**: Maximiza/restaura la ventana
- **Esquina inferior derecha**: Arrastra para redimensionar

## Notas Técnicas

- Las ventanas se centran automáticamente al abrirse
- El z-index se incrementa automáticamente al hacer clic en una ventana
- Las ventanas respetan los límites de la pantalla
- El componente es completamente controlado (no maneja su propio estado de apertura/cierre)
- Compatible con SSR (Server-Side Rendering)

## Dependencias

- React 18+
- TypeScript
- Tailwind CSS
- Next.js (opcional, pero recomendado)