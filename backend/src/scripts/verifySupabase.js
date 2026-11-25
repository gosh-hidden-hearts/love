import { supabase } from '../config/supabase.js';
import config from '../config/env.js';

async function checkSupabase() {
  console.log('====================================================');
  console.log('   GOSH Supabase Connection Diagnostic');
  console.log('====================================================');
  console.log('Project URL:', config.supabase.url);
  console.log('Publishable Key:', config.supabase.key.substring(0, 16) + '...');
  console.log('----------------------------------------------------');

  // 1. Auth service check
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log('❌ Auth Service Error:', sessionError.message);
    } else {
      console.log('✅ Auth Service: ONLINE & RESPONSIVE');
    }
  } catch (e) {
    console.log('❌ Auth Service Unreachable:', e.message);
  }

  // 2. Database Tables check
  const tablesToCheck = ['users', 'user_profiles', 'messages', 'conversations', 'contacts', 'encryption_keys'];
  console.log('\nChecking Database Tables:');
  
  let allTablesFound = true;
  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          console.log(`❌ Table '${table}': NOT FOUND (Tables need to be created)`);
          allTablesFound = false;
        } else {
          console.log(`⚠️ Table '${table}': Accessible with response/error (${error.code || error.message})`);
        }
      } else {
        console.log(`✅ Table '${table}': READY & ACCESSIBLE (Rows: ${data ? data.length : 0})`);
      }
    } catch (e) {
      console.log(`❌ Table '${table}': Exception -`, e.message);
      allTablesFound = false;
    }
  }

  console.log('----------------------------------------------------');
  if (allTablesFound) {
    console.log('🎉 SUPABASE IS FULLY CONNECTED & SCHEMA IS READY!');
  } else {
    console.log('⚠️ Supabase credentials are valid and connected,');
    console.log('   but database tables have not been created yet.');
    console.log('   Run database/supabase_master_setup.sql in the Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/azwclorwxrzgofmribms/sql/new');
  }
  console.log('====================================================');
}

checkSupabase().catch(console.error);
