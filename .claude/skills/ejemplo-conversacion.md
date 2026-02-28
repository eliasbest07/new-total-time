# Ejemplo de Conversación para Analizar

Esta es una conversación de ejemplo que puedes usar para probar la skill `conversation-to-pizarra`.

## Conversación de Ejemplo 1: Proyecto de Desarrollo Web

```
Manager: "Necesitamos crear un nuevo dashboard para el cliente XYZ"

Dev: "¿Qué funcionalidades necesita?"

Manager: "Debe mostrar métricas en tiempo real, generar reportes, y tener un sistema de alertas. También necesitamos autenticación de usuarios."

Dev: "Entendido. ¿Cuál es el timeline?"

Manager: "Tenemos 60 horas de desarrollo. La fecha límite es el 30 de marzo. Además, tenemos una reunión de kick-off el 5 de marzo a las 10:00 AM que durará 2 horas."

Dev: "Perfecto. Entonces las tareas serían: diseñar la arquitectura, implementar autenticación, crear el dashboard de métricas, desarrollar el sistema de reportes, implementar alertas, y hacer testing."

Manager: "Exacto. Documenta todo eso para que el equipo lo vea."
```

## Resultado Esperado

La skill debería generar:

1. **Una Nota** sobre el proyecto del Dashboard para cliente XYZ
2. **Una Lista de Tareas** con los 6 items mencionados
3. **Una Misión** con 60 horas, fecha límite 30 de marzo
4. **Una Actividad** para la reunión del 5 de marzo a las 10:00
5. **Conexiones** entre la nota y la lista de tareas, y entre la nota y la misión

---

## Conversación de Ejemplo 2: Planificación Personal

```
"Mañana tengo que hacer varias cosas importantes:
- Llamar al dentista para agendar cita
- Terminar el informe trimestral
- Revisar los emails pendientes
- Preparar la presentación para el viernes
- Hacer ejercicio por 1 hora

La presentación del viernes es a las 3:00 PM y durará 1 hora. Es sobre los resultados del Q1."
```

## Resultado Esperado

La skill debería generar:

1. **Una Lista de Tareas** con las 5 acciones del día
2. **Una Nota** sobre la presentación del Q1
3. **Una Actividad** para la presentación del viernes a las 3:00 PM
4. **Conexión** entre la nota y la actividad

---

## Conversación de Ejemplo 3: Brainstorming de Ideas

```
"Estuve pensando en ideas para mejorar la app:

Primero, podríamos agregar modo oscuro - muchos usuarios lo han pedido.

Segundo, integrar notificaciones push para mantener a los usuarios engaged.

Tercero, crear un sistema de badges y achievements para gamificación.

Y por último, mejorar el onboarding para nuevos usuarios con un tour interactivo."
```

## Resultado Esperado

La skill debería generar:

1. **Una Nota** principal sobre "Ideas para Mejorar la App"
2. **Una Lista de Tareas** con las 4 ideas como items a evaluar/implementar
3. **Conexión** entre la nota y la lista

---

## Cómo Usar Estos Ejemplos

1. Copia una de las conversaciones de arriba
2. Invoca la skill: `@conversation-to-pizarra`
3. Pega la conversación
4. Obtén el JSON y URL generados
5. Copia la URL y úsala para importar a tu pizarra

## Tips para Mejores Resultados

- Incluye fechas específicas cuando sea posible
- Menciona horas estimadas para proyectos
- Sé claro sobre las relaciones entre elementos
- Usa términos como "tareas", "proyecto", "reunión" para ayudar a la categorización
