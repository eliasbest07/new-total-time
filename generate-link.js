const json = [
  {
    "action": "create_note",
    "note": {
      "title": "Proyecto: Pizarra Digital",
      "content": "Sistema de gestión de cards en tiempo real.\n\nFeatures:\n- Drag & drop\n- Conexiones entre cards\n- Auto-sincronización"
    }
  },
  {
    "action": "create_todo",
    "todo": {
      "title": "Tareas Frontend",
      "items": [
        "Diseñar interfaz",
        "Implementar componentes",
        "Testing"
      ]
    }
  },
  {
    "action": "create_mision",
    "mision": {
      "nombre": "Desarrollo Frontend",
      "descripcion": "Implementar la interfaz de usuario",
      "horas": 40,
      "fecha_start": "2024-02-20T09:00:00",
      "fecha_end": "2024-03-10T17:00:00",
      "estado": "activa"
    }
  },
  {
    "action": "create_actividad",
    "actividad": {
      "descripcion": "Reunión de planificación",
      "fecha": "2024-02-21",
      "hora_inicio": "14:30",
      "cant_horas": 2
    }
  }
];

const encoded = encodeURIComponent(JSON.stringify(json));
const link = `http://localhost:3001/pizarra?import=${encoded}`;
console.log(link);
