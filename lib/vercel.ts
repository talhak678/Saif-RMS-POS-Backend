const VERCEL_API = 'https://api.vercel.com';
// IMPORTANT: Vercel API requires team SLUG, not teamId!
const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.TARGET_PROJECT_ID || "prj_nRED2jSm4JcRMWlLW7Aw1wec7Hkl";
const TEAM_SLUG = process.env.VERCEL_TEAM_SLUG || "talhas-projects-b89d9ca6";

function getHeaders() {
    return {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    };
}

// CRITICAL FIX: Use 'slug' param NOT 'teamId' param
function getTeamParam() {
    return TEAM_SLUG ? `?slug=${TEAM_SLUG}` : '';
}

/**
 * Adds a custom domain to the Vercel Website project automatically.
 */
export async function addDomainToVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing. Skipping domain connection.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();
    const rootDomain = domain.replace(/^www\./, '').toLowerCase().trim();

    try {
        console.log(`🚀 [VERCEL] Adding domain: ${rootDomain} to project: ${PROJECT_ID} with slug: ${TEAM_SLUG}`);

        // Add root domain
        const response = await fetch(`${VERCEL_API}/v10/projects/${PROJECT_ID}/domains${teamParam}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: rootDomain })
        });

        const data = await response.json();

        if (!response.ok && data.error?.code !== 'domain_already_exists') {
            console.error('💥 [VERCEL] Root domain error:', JSON.stringify(data));
            return { success: false, error: data.error?.message || 'Failed to add root domain' };
        }

        console.log(`✅ [VERCEL] Root domain added: ${rootDomain}`);

        // Add www version
        try {
            const wwwRes = await fetch(`${VERCEL_API}/v10/projects/${PROJECT_ID}/domains${teamParam}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name: `www.${rootDomain}` })
            });
            const wwwData = await wwwRes.json();
            if (wwwRes.ok) console.log(`✅ [VERCEL] WWW subdomain added: www.${rootDomain}`);
        } catch (e: any) {
            console.log(`ℹ️ [VERCEL] WWW skipped: ${e.message}`);
        }

        return { success: true, data };
    } catch (error: any) {
        console.error('💥 [VERCEL] Network error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Removes a custom domain from the Vercel Website project.
 */
export async function removeDomainFromVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing. Skipping domain removal.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();
    const rootDomain = domain.replace(/^www\./, '').toLowerCase().trim();

    try {
        console.log(`🗑️ [VERCEL] Removing domain: ${rootDomain}`);

        await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/${rootDomain}${teamParam}`, {
            method: 'DELETE',
            headers,
        });

        await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/www.${rootDomain}${teamParam}`, {
            method: 'DELETE',
            headers,
        }).catch(() => { });

        return { success: true };
    } catch (error: any) {
        console.error('💥 [VERCEL] Error removing domain:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Gets the domain configuration status from Vercel.
 */
export async function getDomainConfigFromVercel(domain: string) {
    if (!TOKEN || !PROJECT_ID) {
        console.log('⚠️ Vercel Token or Project ID missing. Skipping status check.');
        return null;
    }

    const headers = getHeaders();
    const teamParam = getTeamParam();
    const rootDomain = domain.replace(/^www\./, '').toLowerCase().trim();

    try {
        console.log(`🔍 [VERCEL] Checking config for: ${rootDomain}`);

        const configRes = await fetch(`${VERCEL_API}/v6/domains/${rootDomain}/config${teamParam}`, {
            method: 'GET',
            headers,
        });
        const configData = await configRes.json();

        const domainRes = await fetch(`${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/${rootDomain}${teamParam}`, {
            method: 'GET',
            headers,
        });
        const projectDomainData = await domainRes.json();

        return {
            config: configData,
            projectDomain: projectDomainData || null,
            isConfigured: projectDomainData?.verified === true && !configData.misconfigured,
            conflicts: configData.conflicts || [],
        };
    } catch (error: any) {
        console.error('💥 [VERCEL] Error checking config:', error.message);
        return null;
    }
}
