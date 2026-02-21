import { NextResponse } from 'next/server';

export async function GET() {
  const data = [
    {
      "action": "create_note",
      "note": {
        "title": "Nota desde URL (API)",
        "content": "Esta nota fue importada exitosamente desde una URL remota.\n\nFunciona perfectamente para integraciones con n8n, Zapier o cualquier backend.",
        "tags": ["api", "import", "test"]
      }
    },
    {
      "action": "create_todo",
      "todo": {
        "title": "Pasos de Verificación",
        "items": [
          "Endpoint creado",
          "Fetch realizado",
          "JSON parseado",
          "Cards generadas"
        ]
      }
    },
    {
      "action": "create_ticket",
      "ticket": {
        "title": "Revisar Integración",
        "description": "Verificar que el formato JSON coincida con la especificación del ImportAIModal.",
        "hours": 2
      }
    }
  ];

  return NextResponse.json(data);
}
