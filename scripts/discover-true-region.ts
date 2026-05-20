import { Client } from 'pg';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-central-1', 'af-south-1'
];

async function findTrueRegion(projectRef: string, password: string) {
    console.log(`\nProbing regions for project ${projectRef}...`);
    for (const region of regions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const client = new Client({
            user: `postgres.${projectRef}`,
            password: password,
            host: host,
            port: 5432, // Use 5432 Session Mode
            database: 'postgres',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 4000 // fast timeout
        });

        try {
            await client.connect();
            console.log(`🎯 SUCCESS! Project ${projectRef} is in region: ${region}`);
            console.log(`   Host: ${host}`);
            await client.end();
            return region;
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Tenant or user not found')) {
                // Not this region, quiet skip
            } else if (msg.includes('password authentication failed') || msg.includes('SSL') || msg.includes('timeout')) {
                // Authentication failed or other error means the tenant WAS found but password or handshake failed!
                console.log(`⚠️ Tenant found in region ${region} but connection failed: ${msg}`);
                await client.end();
                return region;
            } else {
                // Other errors
                // console.log(`   Region ${region} failed with: ${msg}`);
            }
        }
    }
    console.log(`❌ Could not find active region for project ${projectRef}`);
    return null;
}

async function main() {
    console.log('Starting True Region Discovery...');
    const sourceRegion = await findTrueRegion('xqsewdcggvujkmddtltd', '@Solution1053##');
    const targetRegion = await findTrueRegion('snzcseuwhbxhvscqrkuy', '@Solution1053##');
    
    console.log('\n--- Discovery Summary ---');
    console.log(`Source Region: ${sourceRegion || 'Unknown'}`);
    console.log(`Target Region: ${targetRegion || 'Unknown'}`);
}

main();
