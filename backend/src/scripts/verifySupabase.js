import { supabase, checkSupabaseHealth } from '../config/supabase.js';
import config from '../config/env.js';

async function checkSupabase() {
  console.log('====================================================');
  console.log('   GOSH Supabase Connection Diagnostic');
  console.log('====================================================');
  console.log('Project URL:', config.supabase.url);
  console.log(
    'Key Type:',
    config.supabase.isPublishableKey
      ? '❌ Publishable/Anon Key (Replace with SUPABASE_SERVICE_ROLE_KEY!)'
      : '✅ Service Role / Secret Key'
  );
  console.log('----------------------------------------------------');

  const health = await checkSupabaseHealth();
  if (health.connected) {
    console.log('✅ Supabase PostgreSQL: CONNECTED');
  } else {
    console.log('❌ Supabase PostgreSQL Error:', health.error, health.code ? `(${health.code})` : '');
  }

  const tablesToCheck = [
    'users',
    'user_profiles',
    'user_identifiers',
    'user_settings',
    'contacts',
    'conversations',
    'conversation_members',
    'messages',
    'encryption_keys',
    'statuses',
    'calls',
    'memory_spaces',
    'memory_files'
  ];

  console.log('\nChecking Database Tables:');
  let allTablesReady = true;
  for (const table of tablesToCheck) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table '${table}': ${error.code || ''} ${error.message}`);
        allTablesReady = false;
      } else {
        console.log(`✅ Table '${table}': READY & ACCESSIBLE`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': Exception -`, e.message);
      allTablesReady = false;
    }
  }

  console.log('----------------------------------------------------');
  if (allTablesReady && !config.supabase.isPublishableKey) {
    console.log('🎉 SUPABASE IS FULLY CONNECTED WITH SERVICE ROLE & SCHEMA IS READY!');
  } else {
    console.log('⚠️ Action needed: verify SUPABASE_SERVICE_ROLE_KEY and database/supabase_master_setup.sql.');
  }
  console.log('====================================================');
}

checkSupabase().catch(console.error);
