import { Client } from 'pg';
import dns from 'dns';

const allRegions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-central-1', 'af-south-1'
];

async function filterActiveRegions() {
    const active: string[] = [];
    for (const region of allRegions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        try {
            await new Promise((resolve, reject) => {
                dns.resolve4(host, (err, addrs) => {
                    if (err) reject(err);
                    else resolve(addrs);
                });
            });
            active.push(region);
        } catch {
            // inactive
        }
    }
    return active;
}

async function findTrueRegion(projectRef: string, password: string, activeRegions: string[]) {
    console.log(`\nProbing active regions for project ${projectRef}...`);
    for (const region of activeRegions) {
        const host = `aws-0-${region}.pooler.supabase.com`;
        const client = new Client({
            user: `postgres.${projectRef}`,
            password: password,
            host: host,
            port: 6543,
            database: 'postgres',
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            console.log(`🎯 FOUND TENANT! Project ${projectRef} is in region: ${region}`);
            await client.end();
            return region;
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Tenant or user not found')) {
                // Tenant not in this region
            } else if (msg.includes('password authentication failed') || msg.includes('SSL connection') || msg.includes('self-signed')) {
                console.log(`🎯 FOUND TENANT (auth/SSL error)! Project ${projectRef} is in region: ${region} (Msg: ${msg})`);
                await client.end();
                return region;
            } else {
                console.log(`   Probed ${region} - received other error: ${msg}`);
            }
        }
    }
    return null;
}

async function main() {
    console.log('Filtering active DNS pooler regions...');
    const active = await filterActiveRegions();
    console.log(`Active pooler regions (${active.length}): ${active.join(', ')}`);

    const sourceRegion = await findTrueRegion('xqsewdcggvujkmddtltd', '@Solution1053##', active);
    const targetRegion = await findTrueRegion('snzcseuwhbxhvscqrkuy', '@Alwayslog123##', active);

    console.log('\n--- Final Summary ---');
    console.log(`Source Region: ${sourceRegion || 'Unknown'}`);
    console.log(`Target Region: ${targetRegion || 'Unknown'}`);
}

main();
