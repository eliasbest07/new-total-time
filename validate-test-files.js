const fs = require('fs');

console.log("========== VALIDANDO JSONs EN test_files ==========\n");

// Test 1: Simple JSON
console.log("1. Validando test_simple_note_todo.json:");
try {
  const simple = JSON.parse(fs.readFileSync('./test_files/test_simple_note_todo.json', 'utf8'));
  console.log("✓ JSON válido");
  console.log("  Items:", simple.length);
  console.log("  Tipos:", simple.map(x => x.action).join(", "));
} catch(e) {
  console.error("✗ Error:", e.message);
}

// Test 2: Complex JSON
console.log("\n2. Validando test_complex_all_types.json:");
try {
  const complex = JSON.parse(fs.readFileSync('./test_files/test_complex_all_types.json', 'utf8'));
  console.log("✓ JSON válido");
  console.log("  Items:", complex.length);
  console.log("  Tipos:", complex.map(x => x.action).join(", "));
} catch(e) {
  console.error("✗ Error:", e.message);
}

// Test URLs by decoding them
console.log("\n========== VALIDANDO URLs EN test_files ==========\n");

// URL 1: Simple
console.log("3. Validando test_simple_note_todo.txt (URL):");
try {
  const urlContent = fs.readFileSync('./test_files/test_simple_note_todo.txt', 'utf8');
  const urlPart = urlContent.split('?import=')[1];
  const decoded = decodeURIComponent(urlPart);
  const parsed = JSON.parse(decoded);
  console.log("✓ URL válido, JSON decodificado correctamente");
  console.log("  Items:", parsed.length);
  console.log("  Tipos:", parsed.map(x => x.action).join(", "));
} catch(e) {
  console.error("✗ Error:", e.message);
}

// URL 2: Complex
console.log("\n4. Validando test_complex_all_types.txt (URL):");
try {
  const urlContent = fs.readFileSync('./test_files/test_complex_all_types.txt', 'utf8');
  const urlPart = urlContent.split('?import=')[1];
  const decoded = decodeURIComponent(urlPart);
  const parsed = JSON.parse(decoded);
  console.log("✓ URL válido, JSON decodificado correctamente");
  console.log("  Items:", parsed.length);
  console.log("  Tipos:", parsed.map(x => x.action).join(", "));
} catch(e) {
  console.error("✗ Error:", e.message);
}

console.log("\n========== SUMMARY ==========");
console.log("All files created in test_files/:");
console.log("  ✓ test_simple_note_todo.txt (URL)");
console.log("  ✓ test_complex_all_types.txt (URL)");
console.log("  ✓ test_simple_note_todo.json (JSON puro)");
console.log("  ✓ test_complex_all_types.json (JSON puro)");
