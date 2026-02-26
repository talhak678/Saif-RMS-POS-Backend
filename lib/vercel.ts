const VERCEL_API = 'https://api.vercel.com';
const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional

/**
 * Adds a custom domain to the Vercel project automatically.
 * This handles both the root domain and the www subdomain.
 */
export async function addDomainToVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing in environment variables. Skipping automatic domain connection.');
        return null;
    }

    const headers = {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    };

    const teamParam = TEAM_ID ? `?teamId=${TEAM_ID}` : '';

    try {
        console.log(`🚀 Adding domain to Vercel: ${domain}`);

        // 1. Add the domain
        const response = await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains${teamParam}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: domain })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('💥 Vercel API Error:', data);
            return null;
        }

        console.log(`✅ Domain added to Vercel: ${domain}`);

        // 2. If it's a root domain, also add the 'www' version for convenience
        if (!domain.startsWith('www.')) {
            try {
                await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains${teamParam}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ name: `www.${domain}` })
                });
                console.log(`✅ WWW Subdomain added to Vercel: www.${domain}`);
            } catch (err: any) {
                console.log(`ℹ️ WWW Subdomain might already exist or failed: ${err.message}`);
            }
        }

        return data;
    } catch (error: any) {
        console.error('💥 Error adding domain to Vercel:', error.message);
        return null;
    }
}
