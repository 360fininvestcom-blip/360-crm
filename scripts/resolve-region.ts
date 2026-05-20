import dns from 'dns';

const regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
    'sa-east-1', 'ca-central-1', 'me-central-1', 'af-south-1'
];

async function resolveRegion(projectRef: string) {
    console.log(`Searching for regional pooler of project: ${projectRef}...`);
    for (const region of regions) {
        const hostname = `aws-0-${region}.pooler.supabase.com`;
        try {
            const addresses = await new Promise<string[]>((resolve, reject) => {
                dns.resolve4(hostname, (err, addrs) => {
                    if (err) reject(err);
                    else resolve(addrs);
                });
            });
            if (addresses && addresses.length > 0) {
                console.log(`🟢 Region Found! Region: ${region}`);
                console.log(`   Pooler Hostname: ${hostname}`);
                console.log(`   IP Addresses: ${addresses.join(', ')}`);
                return hostname;
            }
        } catch (e) {
            // Region is not the one
        }
    }
    console.log(`❌ Could not resolve regional pooler for project: ${projectRef}`);
    return null;
}

async function main() {
    // Check old project
    await resolveRegion('xqsewdcggvujkmddtltd');
    // Check new project
    await resolveRegion('snzcseuwhbxhvscqrkuy');
}

main();
