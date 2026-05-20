import { createClient } from '@supabase/supabase-js';

const sourceUrl = 'https://xqsewdcggvujkmddtltd.supabase.co';
const sourceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhxc2V3ZGNnZ3Z1amttZGR0bHRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODgzMTI0NCwiZXhwIjoyMDg0NDA3MjQ0fQ.1TUSdHKCEWxlA6JIcqrmGDkxzZuXoK09VC-P4ByQrYM';

const targetUrl = 'https://snzcseuwhbxhvscqrkuy.supabase.co';
const targetKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNuemNzZXV3aGJ4aHZzY3Fya3V5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3NTc3NCwiZXhwIjoyMDk0ODUxNzc0fQ.Tm3RyPJTVSw_i-0m8Emkc9BYmirPD5O-IRyDM2MbuJA';

async function testSupabaseClients() {
    const sourceSupabase = createClient(sourceUrl, sourceKey);
    const targetSupabase = createClient(targetUrl, targetKey);

    console.log('Testing Source Supabase Client (HTTP)...');
    const { data: sourceData, error: sourceErr } = await sourceSupabase.from('contacts').select('id').limit(1);
    if (sourceErr) {
        console.error('❌ Source client error:', sourceErr);
    } else {
        console.log('✅ Source client connected successfully! Row sample:', sourceData);
    }

    console.log('Testing Target Supabase Client (HTTP)...');
    const { data: targetData, error: targetErr } = await targetSupabase.from('contacts').select('id').limit(1);
    if (targetErr) {
        console.error('❌ Target client error:', targetErr);
    } else {
        console.log('✅ Target client connected successfully! Row sample:', targetData);
    }
}

testSupabaseClients();
