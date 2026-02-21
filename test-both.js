// Test 1: Simple - solo note y todo
console.log("========== TEST 1: Simple (note + todo) ==========\n");

const test1 = [
  {
    action: "create_note",
    note: { title: "Note", content: "Content" }
  },
  {
    action: "create_todo",
    todo: { title: "Todo", items: ["Item 1"] }
  }
];

console.log("1. JSON original:");
console.log(JSON.stringify(test1, null, 2));

console.log("\n2. Viendo si es válido JSON:");
try {
  const str1 = JSON.stringify(test1);
  JSON.parse(str1);
  console.log("✓ JSON válido");
} catch(e) {
  console.error("❌ Error:", e.message);
}

console.log("\n3. Codificando con encodeURIComponent:");
const encoded1 = encodeURIComponent(JSON.stringify(test1));
console.log("Encoded:", encoded1);

console.log("\n4. Decodificando y parseando:");
try {
  const decoded1 = decodeURIComponent(encoded1);
  console.log("Decoded string:", decoded1);
  const parsed1 = JSON.parse(decoded1);
  console.log("✓ Parseado correctamente");
  console.log("Items:", parsed1.length);
} catch(e) {
  console.error("❌ Error:", e.message);
}

const url1 = `http://localhost:3000/?import=${encoded1}`;
console.log("\n5. URL generada:");
console.log(url1);

// Test 2: Complex - mision, actividad, todo
console.log("\n\n========== TEST 2: Complex (mision + actividad + todo) ==========\n");

const test2 = [
  {
    action: "create_mision",
    mision: {
      nombre: "Mision",
      descripcion: "Desc",
      horas: 10,
      fecha_start: "2024-02-20",
      fecha_end: "2024-02-25",
      estado: "activa"
    }
  },
  {
    action: "create_actividad",
    actividad: {
      descripcion: "Act",
      fecha: "2024-02-21",
      hora_inicio: "14:00",
      cant_horas: 2
    }
  },
  {
    action: "create_todo",
    todo: { title: "Todo", items: ["Item"] }
  }
];

console.log("1. JSON original:");
console.log(JSON.stringify(test2, null, 2));

console.log("\n2. Viendo si es válido JSON:");
try {
  const str2 = JSON.stringify(test2);
  JSON.parse(str2);
  console.log("✓ JSON válido");
} catch(e) {
  console.error("❌ Error:", e.message);
}

console.log("\n3. Codificando con encodeURIComponent:");
const encoded2 = encodeURIComponent(JSON.stringify(test2));
console.log("Encoded:", encoded2);

console.log("\n4. Decodificando y parseando:");
try {
  const decoded2 = decodeURIComponent(encoded2);
  console.log("Decoded string:", decoded2);
  const parsed2 = JSON.parse(decoded2);
  console.log("✓ Parseado correctamente");
  console.log("Items:", parsed2.length);
} catch(e) {
  console.error("❌ Error:", e.message);
}

const url2 = `http://localhost:3000/?import=${encoded2}`;
console.log("\n5. URL generada:");
console.log(url2);

console.log("\n\n========== RESULTADOS FINALES ==========");
console.log("\nTest 1 (simple) URL:");
console.log(url1);
console.log("\nTest 2 (complex) URL:");
console.log(url2);
