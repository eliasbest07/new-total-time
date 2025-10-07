// Script de prueba para verificar la funcionalidad de salas
// Ejecutar con: node scripts/test-salas.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSalas() {
  console.log('🧪 Iniciando prueba de salas...');
  
  try {
    // Probar conexión básica
    console.log('1. Probando conexión a Supabase...');
    const { data: testData, error: testError } = await supabase
      .from('sala')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error de conexión:', testError);
      return;
    }
    
    console.log('✅ Conexión exitosa');
    
    // Listar todas las organizaciones
    console.log('2. Listando organizaciones...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizacion')
      .select('id, nombre, id_salas');
    
    if (orgError) {
      console.error('❌ Error obteniendo organizaciones:', orgError);
      return;
    }
    
    console.log('📋 Organizaciones encontradas:', orgs?.length || 0);
    orgs?.forEach(org => {
      console.log(`  - ${org.nombre} (ID: ${org.id})`);
      console.log(`    ID Salas: ${JSON.stringify(org.id_salas)}`);
    });
    
    // Listar todas las salas
    console.log('3. Listando salas...');
    const { data: salas, error: salasError } = await supabase
      .from('sala')
      .select('*');
    
    if (salasError) {
      console.error('❌ Error obteniendo salas:', salasError);
      return;
    }
    
    console.log('🏠 Salas encontradas:', salas?.length || 0);
    salas?.forEach(sala => {
      console.log(`  - ${sala.nombre} (ID: ${sala.id}, Org: ${sala.id_organizacion})`);
    });
    
    // Probar el flujo completo con la primera organización que tenga id_salas
    const orgConSalas = orgs?.find(org => org.id_salas && org.id_salas.length > 0);
    
    if (orgConSalas) {
      console.log('4. Probando flujo completo con organización:', orgConSalas.nombre);
      
      const salaIds = orgConSalas.id_salas.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      console.log('   IDs de salas a buscar:', salaIds);
      
      const { data: salasOrg, error: salasOrgError } = await supabase
        .from('sala')
        .select('*')
        .in('id', salaIds);
      
      if (salasOrgError) {
        console.error('❌ Error obteniendo salas de la organización:', salasOrgError);
        return;
      }
      
      console.log('✅ Salas de la organización:', salasOrg?.length || 0);
      salasOrg?.forEach(sala => {
        console.log(`     - ${sala.nombre} (ID: ${sala.id})`);
      });
    } else {
      console.log('ℹ️ No se encontró ninguna organización con salas asignadas');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testSalas();