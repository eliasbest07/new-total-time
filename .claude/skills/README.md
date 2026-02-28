# Skills de Claude Code

Este directorio contiene skills personalizadas para Claude Code.

## Skills Disponibles

### conversation-to-pizarra

Analiza conversaciones y genera URLs con datos estructurados para importar a la pizarra.

**Cómo usar:**

1. Invoca la skill escribiendo:
   ```
   @conversation-to-pizarra
   ```

2. Luego proporciona la conversación que quieres analizar, ya sea:
   - Pegando el texto directamente
   - Proporcionando un archivo de conversación
   - Describiendo el contexto de lo que necesitas

3. La skill analizará la conversación y te devolverá:
   - Análisis de lo identificado
   - JSON estructurado
   - URL completa lista para importar
   - Explicación de las conexiones

**Ejemplo de uso:**

```
@conversation-to-pizarra

Analiza esta conversación:

Usuario: "Necesito organizar el proyecto de migración de base de datos"
Asistente: "Claro, ¿qué tareas necesitas realizar?"
Usuario: "Primero hacer backup, luego migrar las tablas, actualizar las queries, y finalmente hacer pruebas"
Asistente: "¿Cuánto tiempo estimas?"
Usuario: "Unas 20 horas en total, lo quiero terminar para el 15 de marzo"
```

La skill generará automáticamente una nota sobre el proyecto, una lista de tareas con los pasos, y potencialmente una misión con las horas estimadas y fecha límite.

## Estructura del JSON Generado

El JSON sigue este formato:

```json
[
  {
    "action": "create_note | create_todo | create_mision | create_actividad",
    "note | todo | mision | actividad": { ... }
  },
  {
    "action": "create_connection",
    "connection": {
      "from_index": 0,
      "to_index": 1
    }
  }
]
```

## Tipos de Elementos

- **create_note**: Notas, ideas, conceptos
- **create_todo**: Listas de tareas
- **create_mision**: Proyectos con horas estimadas
- **create_actividad**: Eventos con fecha y hora
- **create_connection**: Conexiones entre elementos

## Consejos

- Sé específico en tu conversación para mejores resultados
- Menciona fechas, horas y plazos cuando sea relevante
- Indica relaciones entre elementos
- La skill usa cadenas de pensamiento para mejor comprensión
