// Generate test import link with 4 items: note, todo, mision, actividad

const items = [
  {
    action: 'create_note',
    note: {
      title: 'Proyecto: Pizarra Digital',
      content: 'Sistema de gestion de cards en tiempo real.'
    }
  },
  {
    action: 'create_todo',
    todo: {
      title: 'Tareas Frontend',
      items: ['Disenar interfaz', 'Implementar componentes', 'Testing']
    }
  },
  {
    action: 'create_mision',
    mision: {
      nombre: 'Desarrollo Frontend',
      descripcion: 'Implementar la interfaz de usuario',
      horas: 40,
      fecha_start: '2024-02-20T09:00:00',
      fecha_end: '2024-03-10T17:00:00',
      estado: 'activa'
    }
  },
  {
    action: 'create_actividad',
    actividad: {
      descripcion: 'Reunion de planificacion',
      fecha: '2024-02-21',
      hora_inicio: '14:30',
      cant_horas: 2
    }
  }
];

const encoded = encodeURIComponent(JSON.stringify(items));
const link = `http://localhost:3000/?import=${encoded}`;

console.log(link);
