const json = [
  {
    "action": "create_note",
    "note": {
      "title": "Proyecto: Pizarra Digital",
      "content": "Sistema de gestión de cards en tiempo real.\n\nFeatures:\n- Drag & drop\n- Conexiones entre cards\n- Auto-sincronización\n- Exporta/importa datos"
    }
  },
  {
    "action": "create_todo",
    "todo": {
      "title": "Tareas Frontend",
      "items": [
        "Diseñar interfaz principal",
        "Implementar componente Card",
        "Agregar drag & drop",
        "Testing unitarios",
        "Optimizar performance"
      ]
    }
  },
  {
    "action": "create_note",
    "note": {
      "title": "Arquitectura",
      "content": "Stack:\n- Frontend: React 18 + TypeScript\n- Backend: Next.js 15\n- DB: Supabase PostgreSQL\n- Estado: Zustand\n- Estilos: Tailwind CSS"
    }
  },
  {
    "action": "create_ticket",
    "ticket": {
      "title": "Implementar API REST",
      "description": "Crear endpoints para CRUD de cards y conexiones.",
      "hours": 8
    }
  },
  {
    "action": "create_todo",
    "todo": {
      "title": "Checklist QA",
      "items": [
        "Pruebas en Chrome",
        "Pruebas en Firefox",
        "Testing mobile responsivo",
        "Verificar CORS"
      ]
    }
  },
  {
    "action": "create_ticket",
    "ticket": {
      "title": "Setup BD",
      "description": "Configurar Supabase y crear tablas.",
      "hours": 4
    }
  },
  {
    "action": "create_note",
    "note": {
      "title": "Recordatorio - Reunión",
      "content": "Revisar avance con team el viernes.\n\nTemas:\n- Progress en frontend\n- Status de BD\n- Timeline"
    }
  },
  {
    "action": "create_ticket",
    "ticket": {
      "title": "Documentación",
      "description": "Crear README.md con instrucciones de setup.",
      "hours": 3
    }
  }
];

const encoded = encodeURIComponent(JSON.stringify(json));
const link = `http://localhost:3001/pizarra?import=${encoded}`;
console.log(link);
