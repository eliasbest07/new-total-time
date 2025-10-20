# API de Captura de Pantalla Bajo Demanda

Esta API permite obtener una captura de pantalla inmediata cuando el usuario ya está compartiendo su pantalla en la pizarra. La imagen se sube automáticamente a **Supabase Storage** y retorna la **URL pública** de la imagen.

## 🚀 Cómo Funciona

1. El usuario comparte su pantalla en la pizarra
2. Se hace una petición al endpoint
3. La captura se toma en el **cliente** (navegador) usando `getDisplayMedia` y `canvas`
4. La imagen se **sube a Supabase Storage** automáticamente
5. También se **guarda el registro en la base de datos**
6. Se retorna la **URL pública** de Supabase donde está alojada la imagen

### Prerequisitos

1. El usuario debe estar en la pizarra (`/pizarra`)
2. Debe haber presionado el botón ▶️ para iniciar una misión
3. Debe haber aceptado compartir su pantalla
4. La captura debe estar activa (contador corriendo)

## 📡 Endpoints Disponibles

### 1. `/api/capture` (GET)

Endpoint informativo que explica cómo usar la API.

**Respuesta:**
```json
{
  "success": true,
  "message": "Para obtener una captura, use uno de estos métodos:",
  "methods": {
    "browser": "Abrir /api/capture/client?action=get en el navegador donde está la pizarra",
    "javascript": "Llamar window.pizarraCaptureNow() desde la consola del navegador",
    "fetch": "Hacer fetch a /api/capture/client?action=get desde el mismo origen"
  },
  "note": "La captura solo funciona si la pizarra está activa y compartiendo pantalla en ese navegador"
}
```

### 2. `/api/capture/client?action=get` (Página del Cliente)

Página que ejecuta en el cliente y obtiene la captura actual.

**Uso:**
```bash
# Abrir en el navegador donde está la pizarra activa
https://tu-dominio.com/api/capture/client?action=get
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "url": "https://[tu-proyecto].supabase.co/storage/v1/object/public/capturas/123/capture-now-1234567890.jpg",
  "timestamp": 1234567890,
  "message": "Captura guardada exitosamente en Supabase"
}
```

**Respuesta de error:**
```json
{
  "success": false,
  "error": "No hay captura de pantalla activa",
  "timestamp": 1234567890
}
```

### 3. `window.pizarraCaptureNow()` (JavaScript Directo)

Llamar directamente desde la consola del navegador o desde JavaScript.

**Uso en la consola:**
```javascript
const imageUrl = await window.pizarraCaptureNow();
console.log('URL de la captura en Supabase:', imageUrl);
// Ejemplo: https://[proyecto].supabase.co/storage/v1/object/public/capturas/123/capture-now-1234567890.jpg
```

**Uso en código:**
```javascript
async function getScreenshot() {
  if (window.pizarraCaptureNow) {
    const imageUrl = await window.pizarraCaptureNow();
    if (imageUrl) {
      // imageUrl es la URL pública de Supabase Storage
      // Puedes usarla directamente: <img src={imageUrl} />
      console.log('✅ Captura guardada en Supabase:', imageUrl);
      return imageUrl;
    } else {
      console.error('❌ No hay captura activa o falló la subida');
      return null;
    }
  } else {
    console.error('❌ La pizarra no está disponible');
    return null;
  }
}
```

## 💡 Casos de Uso

### Caso 1: Obtener captura y enviar URL a tu backend
```javascript
// Script que se ejecuta en la misma página
async function monitorearPantalla() {
  setInterval(async () => {
    const imageUrl = await window.pizarraCaptureNow();
    if (imageUrl) {
      // La imagen ya está en Supabase, solo enviamos la URL
      await fetch('/tu-backend/registrar-captura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imageUrl,
          timestamp: Date.now()
        })
      });
      console.log('✅ URL enviada al backend:', imageUrl);
    }
  }, 60000); // cada minuto
}
```

### Caso 2: Botón personalizado para captura
```typescript
// Agregar en tu componente React
function MiComponente() {
  const [lastCaptureUrl, setLastCaptureUrl] = useState<string | null>(null);

  const handleCapture = async () => {
    if (window.pizarraCaptureNow) {
      const url = await window.pizarraCaptureNow();
      if (url) {
        setLastCaptureUrl(url);
        alert('✅ Captura guardada en Supabase!');
        // Puedes abrir la imagen en una nueva pestaña
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div>
      <button onClick={handleCapture}>📸 Capturar Ahora</button>
      {lastCaptureUrl && (
        <img src={lastCaptureUrl} alt="Última captura" style={{ maxWidth: '300px' }} />
      )}
    </div>
  );
}
```

### Caso 3: Fetch desde el mismo dominio
```javascript
// Desde cualquier página de tu aplicación en el mismo navegador
async function obtenerCapturaUrl() {
  const response = await fetch('/api/capture/client?action=get');
  const html = await response.text();

  // Extraer el JSON del HTML
  const jsonMatch = html.match(/<pre>(.*?)<\/pre>/s);
  if (jsonMatch) {
    const data = JSON.parse(jsonMatch[1]);
    if (data.success) {
      console.log('✅ URL obtenida:', data.url);
      return data.url; // URL pública de Supabase
    }
  }
  return null;
}

// Uso
const imageUrl = await obtenerCapturaUrl();
if (imageUrl) {
  // Mostrar la imagen
  document.getElementById('mi-img').src = imageUrl;
}
```

### Caso 4: Integración con sistema externo
```javascript
// Desde tu backend o script externo
// IMPORTANTE: Debe ejecutarse en el navegador donde está la pizarra

async function enviarCapturaASlack() {
  // 1. Obtener la URL de la captura
  const imageUrl = await window.pizarraCaptureNow();

  if (imageUrl) {
    // 2. Enviar la URL a Slack (o cualquier sistema)
    await fetch('https://hooks.slack.com/services/YOUR/WEBHOOK/URL', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '📸 Nueva captura de pantalla disponible',
        attachments: [{
          title: 'Captura de Misión',
          image_url: imageUrl,
          timestamp: Math.floor(Date.now() / 1000)
        }]
      })
    });
    console.log('✅ Captura enviada a Slack');
  }
}
```

## ⚠️ Limitaciones Importantes

1. **Mismo navegador**: La captura solo funciona si haces la petición desde el **mismo navegador** donde la pizarra está activa.

2. **Mismo dominio**: Por restricciones de seguridad (CORS), no puedes hacer fetch desde otro dominio.

3. **Requiere captura activa**: El usuario debe estar compartiendo su pantalla en ese momento.

4. **No funciona desde Postman/curl**: Estos tools ejecutan en el servidor o son clientes independientes sin acceso al stream de video.

## 🎯 Flujo Recomendado

Para implementar un sistema de captura bajo demanda:

1. **Usuario inicia la misión** → Comparte pantalla → Contador inicia
2. **Sistema expone** `window.pizarraCaptureNow` automáticamente
3. **Cuando necesites una captura:**
   - Opción A: Navega a `/api/capture/client?action=get` en el mismo browser
   - Opción B: Ejecuta `window.pizarraCaptureNow()` desde JavaScript
   - Opción C: Usa un iframe que cargue la página del cliente

## 🔧 Debugging

Si no funciona, verifica:

```javascript
// 1. Verificar que la función está disponible
console.log('¿Función disponible?', typeof window.pizarraCaptureNow);

// 2. Verificar que hay stream activo
const resultado = await window.pizarraCaptureNow();
console.log('Resultado:', resultado ? 'Captura obtenida' : 'Sin captura');

// 3. Ver logs en consola
// Busca mensajes que empiecen con [CAPTURE NOW]
```

## 📝 Notas Técnicas

- La imagen se sube en formato **JPEG con 70% de calidad** para balance entre tamaño y calidad
- La resolución máxima es **1920x1080** (Full HD)
- Las imágenes se guardan en **Supabase Storage** en el bucket `capturas`
- El nombre del archivo sigue el patrón: `capture-now-[timestamp].jpg`
- La carpeta de destino es el `id_bloque` (actividadId) de la misión
- La captura es **instantánea** y no interfiere con el sistema de capturas cada 5 minutos
- La URL retornada es **pública** y accesible sin autenticación
- También se crea un registro en la tabla `capturas` de la base de datos

## 🗂️ Estructura de Almacenamiento

```
Supabase Storage (bucket: capturas)
└── [actividadId]/
    ├── 1234567890.jpg          (capturas automáticas cada 5 min)
    ├── 1234567891.jpg
    ├── capture-now-1234567892.jpg  (captura bajo demanda)
    └── capture-now-1234567893.jpg
```

## 🔗 Formato de URL

```
https://[tu-proyecto].supabase.co/storage/v1/object/public/capturas/[actividadId]/capture-now-[timestamp].jpg
```

Ejemplo real:
```
https://abcdefgh.supabase.co/storage/v1/object/public/capturas/123/capture-now-1699900000000.jpg
```
