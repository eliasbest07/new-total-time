// Test JSON - verificar que sea válido
const testJSON = [
  {
    action: "create_note",
    note: {
      title: "Test Note",
      content: "Este es un test"
    }
  },
  {
    action: "create_todo",
    todo: {
      title: "Test Todo",
      items: ["Item 1", "Item 2"]
    }
  },
  {
    action: "create_mision",
    mision: {
      nombre: "Test Mision",
      descripcion: "Test description",
      horas: 10,
      fecha_start: "2024-02-20T09:00:00",
      fecha_end: "2024-02-25T17:00:00",
      estado: "activa"
    }
  },
  {
    action: "create_actividad",
    actividad: {
      descripcion: "Test Actividad",
      fecha: "2024-02-21",
      hora_inicio: "14:30",
      cant_horas: 2
    }
  }
];

// 1. Verificar que el JSON es válido
console.log("1. Verificando JSON...");
try {
  const jsonString = JSON.stringify(testJSON);
  console.log("✓ JSON es válido");
  console.log("JSON string length:", jsonString.length);
  
  // 2. Cifrarlo
  console.log("\n2. Cifrando con encodeURIComponent...");
  const encoded = encodeURIComponent(jsonString);
  console.log("✓ Cifrado exitoso");
  console.log("Encoded length:", encoded.length);
  
  // 3. Generar URL
  console.log("\n3. Generando URL...");
  const url = `http://localhost:3000/?import=${encoded}`;
  console.log("✓ URL generada:");
  console.log(url);
  
  // 4. Verificar que se puede decodificar
  console.log("\n4. Verificando que se puede decodificar...");
  const decoded = decodeURIComponent(encoded);
  const parsed = JSON.parse(decoded);
  console.log("✓ Decodificado y parseado correctamente");
  console.log("Items:", parsed.length);
  
} catch (err) {
  console.error("❌ Error:", err.message);
}
