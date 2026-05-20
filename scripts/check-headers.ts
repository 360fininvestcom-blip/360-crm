async function checkHeaders(url: string) {
    console.log(`Fetching headers from ${url}...`);
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        console.log('Headers:');
        res.headers.forEach((value, key) => {
            console.log(` - ${key}: ${value}`);
        });
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

async function main() {
    await checkHeaders('https://xqsewdcggvujkmddtltd.supabase.co/rest/v1/');
    await checkHeaders('https://snzcseuwhbxhvscqrkuy.supabase.co/rest/v1/');
}

main();
