import { Client } from 'pg';

async function testConnections() {
    const sourceClient = new Client({ 
        user: 'postgres.xqsewdcggvujkmddtltd',
        password: '@Solution1053##',
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    const targetClient = new Client({ 
        user: 'postgres.snzcseuwhbxhvscqrkuy',
        password: '@Solution1053##',
        host: 'aws-0-eu-central-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to Source Database (eu-central-1 port 5432)...');
        await sourceClient.connect();
        console.log('✅ Connected to Source Database successfully!');

        // Get public tables in Source
        const sourceTablesRes = await sourceClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const sourceTables = sourceTablesRes.rows.map(r => r.table_name);
        console.log(`\nSource Database has ${sourceTables.length} tables in public schema:`);

        for (const tableName of sourceTables) {
            const countRes = await sourceClient.query(`SELECT COUNT(*) FROM public."${tableName}"`);
            console.log(` - ${tableName}: ${countRes.rows[0].count} rows`);
        }
    } catch (err) {
        console.error('❌ Source Database connection or query error:', err);
    } finally {
        await sourceClient.end();
    }

    try {
        console.log('Connecting to Target Database (eu-central-1 port 5432)...');
        await targetClient.connect();
        console.log('✅ Connected to Target Database successfully!');

        // Get public tables in Target
        const targetTablesRes = await targetClient.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);
        const targetTables = targetTablesRes.rows.map(r => r.table_name);
        console.log(`\nTarget Database has ${targetTables.length} tables in public schema:`);

        for (const tableName of targetTables) {
            const countRes = await targetClient.query(`SELECT COUNT(*) FROM public."${tableName}"`);
            console.log(` - ${tableName}: ${countRes.rows[0].count} rows`);
        }
    } catch (err) {
        console.error('❌ Target Database connection or query error:', err);
    } finally {
        await targetClient.end();
    }
}

testConnections();
