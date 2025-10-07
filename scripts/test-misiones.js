// Script para probar la inserción de misiones de ejemplo
// Ejecutar con: node scripts/test-misiones.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplaza con tus valores)
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function insertTestMisiones() {
  console.log('🎯 Insertando misiones de prueba...');

  // IMPORTANTE: Cambiar el id_usuario por el ID numérico correcto de tu tabla usuario
  // Para obtenerlo: SELECT id FROM usuario WHERE id_usuario = 'tu-uuid-aqui';
  const ID_USUARIO_NUMERICO = 1; // ⚠️ CAMBIAR POR EL ID CORRECTO

  const misionesPrueba = [
    {
      nombre: 'Optimizar rendimiento del sistema',
      descripcion: 'Mejorar la velocidad de carga y optimizar consultas de base de datos',
      horas: 8,
      fecha_start: new Date().toISOString(),
      fecha_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // +7 días
      id_usuario: ID_USUARIO_NUMERICO, // ID numérico de la tabla usuario
      id_proyecto: null
    },
    {
      nombre: 'Implementar nueva funcionalidad de reportes',
      descripcion: 'Crear sistema de reportes con gráficos y exportación a PDF',
      horas: 12,
      fecha_start: new Date().toISOString(),
      fecha_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // +14 días
      id_usuario: ID_USUARIO_NUMERICO, // ID numérico de la tabla usuario
      id_proyecto: null
    },
    {
      nombre: 'Refactorizar código legacy',
      descripcion: 'Modernizar código antiguo y mejorar la arquitectura',
      horas: 6,
      fecha_start: new Date().toISOString(),
      fecha_end: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // +5 días
      id_usuario: ID_USUARIO_NUMERICO, // ID numérico de la tabla usuario
      id_proyecto: null
    }
  ];

  try {
    const { data, error } = await supabase
      .from('misiones')
      .insert(misionesPrueba)
      .select();

    if (error) {
      console.error('❌ Error insertando misiones:', error);
      return;
    }

    console.log('✅ Misiones insertadas exitosamente:', data);
  } catch (error) {
    console.error('❌ Error en insertTestMisiones:', error);
  }
}

async function getMisiones() {
  console.log('🔍 Obteniendo misiones...');

  try {
    const { data, error } = await supabase
      .from('misiones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo misiones:', error);
      return;
    }

    console.log('📋 Misiones encontradas:', data);
  } catch (error) {
    console.error('❌ Error en getMisiones:', error);
  }
}

// Ejecutar las funciones
async function main() {
  console.log('🚀 Iniciando pruebas de misiones...');
  
  // Primero obtener misiones existentes
  await getMisiones();
  
  // Luego insertar misiones de prueba (comentar si ya tienes datos)
  // await insertTestMisiones();
  
  // Obtener misiones después de insertar
  // await getMisiones();
}

main().catch(console.error);