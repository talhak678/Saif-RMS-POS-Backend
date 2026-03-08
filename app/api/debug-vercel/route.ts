import { NextRequest, NextResponse } from 'next/server'

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER TESTING
export async function GET(req: NextRequest) {
    const TOKEN = process.env.VERCEL_TOKEN;
    const PROJECT_ID = process.env.TARGET_PROJECT_ID || "prj_nRED2jSm4JcRMWlLW7Aw1wec7Hkl";
    const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_pKWyNXrFbEyRyuhvLKmakyzC";

    const envStatus = {
        hasToken: !!TOKEN,
        tokenPreview: TOKEN ? TOKEN.substring(0, 10) + '...' : 'MISSING',
        projectId: PROJECT_ID,
        teamId: TEAM_ID,
    };

    if (!TOKEN) {
        return NextResponse.json({ error: 'VERCEL_TOKEN is missing!', envStatus }, { status: 500 });
    }

    // Try to call Vercel API directly
    const teamParam = `?teamId=${TEAM_ID}`;
    const testDomain = 'challengingheight.org';

    try {
        const response = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains${teamParam}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: testDomain })
        });

        const data = await response.json();

        return NextResponse.json({
            envStatus,
            vercelApiStatus: response.status,
            vercelApiOk: response.ok,
            vercelApiResponse: data,
        });
    } catch (error: any) {
        return NextResponse.json({
            envStatus,
            networkError: error.message,
        }, { status: 500 });
    }
}
