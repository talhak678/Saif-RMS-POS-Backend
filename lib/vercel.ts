const VERCEL_API = 'https://api.vercel.com';
const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional

function getHeaders() {
    return {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    };
}

function getTeamParam() {
    return TEAM_ID ? `?teamId=${TEAM_ID}` : '';
}

/**
 * Adds a custom domain to the Vercel project automatically.
 * This handles both the root domain and the www subdomain.
 */
export async function addDomainToVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing in environment variables. Skipping automatic domain connection.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();

    try {
        console.log(`🚀 Adding domain to Vercel: ${domain}`);

        // Clean domain (remove www. prefix if present for root addition)
        const rootDomain = domain.replace(/^www\./, '');

        // 1. Add the root domain
        const response = await fetch(`${VERCEL_API}/v10/projects/${PROJECT_ID}/domains${teamParam}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: rootDomain })
        });

        const data = await response.json();

        if (!response.ok && data.error?.code !== 'domain_already_exists') {
            console.error('💥 Vercel API Error (root):', data);
            return { success: false, error: data.error };
        }

        console.log(`✅ Root domain added to Vercel: ${rootDomain}`);

        // 2. Also add the 'www' version
        try {
            const wwwResponse = await fetch(`${VERCEL_API}/v10/projects/${PROJECT_ID}/domains${teamParam}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: `www.${rootDomain}` })
            });
            const wwwData = await wwwResponse.json();

            if (wwwResponse.ok || wwwData.error?.code === 'domain_already_exists') {
                console.log(`✅ WWW subdomain added to Vercel: www.${rootDomain}`);
            } else {
                console.log(`ℹ️ WWW subdomain issue:`, wwwData);
            }
        } catch (err: any) {
            console.log(`ℹ️ WWW subdomain might already exist or failed: ${err.message}`);
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('💥 Error adding domain to Vercel:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Removes a custom domain from the Vercel project.
 * Removes both root and www versions.
 */
export async function removeDomainFromVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing. Skipping domain removal.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();
    const rootDomain = domain.replace(/^www\./, '');

    try {
        console.log(`🗑️ Removing domain from Vercel: ${rootDomain}`);

        // Remove root domain
        const rootRes = await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/${rootDomain}${teamParam}`, {
            method: 'DELETE',
            headers,
        });

        if (rootRes.ok) {
            console.log(`✅ Root domain removed: ${rootDomain}`);
        } else {
            const rootData = await rootRes.json();
            console.log(`ℹ️ Root domain removal:`, rootData);
        }

        // Remove www subdomain
        try {
            const wwwRes = await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/www.${rootDomain}${teamParam}`, {
                method: 'DELETE',
                headers,
            });
            if (wwwRes.ok) {
                console.log(`✅ WWW subdomain removed: www.${rootDomain}`);
            }
        } catch (err: any) {
            console.log(`ℹ️ WWW removal skipped: ${err.message}`);
        }

        return { success: true };
    } catch (error: any) {
        console.error('💥 Error removing domain from Vercel:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Gets the domain configuration status from Vercel.
 * Returns detailed info about DNS verification status.
 */
export async function getDomainConfigFromVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing. Skipping status check.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();
    const rootDomain = domain.replace(/^www\./, '');

    try {
        console.log(`🔍 Checking Vercel domain config: ${rootDomain}`);

        // Check domain configuration on Vercel
        const response = await fetch(`${VERCEL_API}/v6/domains/${rootDomain}/config${teamParam}`, {
            method: 'GET',
            headers,
        });

        const configData = await response.json();
        console.log(`📋 Vercel domain config:`, JSON.stringify(configData));

        // Also get domain info from the project
        const domainRes = await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains${teamParam}`, {
            method: 'GET',
            headers,
        });

        const domainList = await domainRes.json();
        const projectDomain = domainList.domains?.find((d: any) =>
            d.name === rootDomain || d.name === `www.${rootDomain}`
        );

        return {
            config: configData,
            projectDomain: projectDomain || null,
            // Vercel considers domain "misconfigured" if not pointing correctly
            isConfigured: configData.misconfigured === false,
            // Domain conflicts or issues
            conflicts: configData.conflicts || [],
            // A Records and CNAME info Vercel expects
            aValues: configData.aValues || [],
            cnames: configData.cnames || [],
        };
    } catch (error: any) {
        console.error('💥 Error checking Vercel domain config:', error.message);
        return null;
    }
}
