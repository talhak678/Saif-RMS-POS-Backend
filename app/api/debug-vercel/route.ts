import { NextRequest, NextResponse } from 'next/server'

// TEMPORARY DEBUG ENDPOINT - DELETE AFTER TESTING
export async function GET(req: NextRequest) {
    const TOKEN = process.env.VERCEL_TOKEN;
    const PROJECT_ID = process.env.TARGET_PROJECT_ID || "prj_nRED2jSm4JcRMWlLW7Aw1wec7Hkl";
    const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_pKWyNXrFbEyRyuhvLKmakyzC";
    const TEAM_SLUG = "talhas-projects-b89d9ca6";
    const testDomain = 'challengingheight.org';

    if (!TOKEN) {
        return NextResponse.json({ error: 'VERCEL_TOKEN is missing!' }, { status: 500 });
    }

    const headers = {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
    };

    const results: any = {};

    // Test 1: With teamId param
    try {
        const r1 = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: testDomain })
        });
        results.test1_withTeamId = { status: r1.status, body: await r1.json() };
    } catch (e: any) { results.test1_withTeamId = { error: e.message }; }

    // Test 2: With team slug param
    try {
        const r2 = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains?slug=${TEAM_SLUG}`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: testDomain })
        });
        results.test2_withSlug = { status: r2.status, body: await r2.json() };
    } catch (e: any) { results.test2_withSlug = { error: e.message }; }

    // Test 3: Without teamId (token-scoped)
    try {
        const r3 = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/domains`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: testDomain })
        });
        results.test3_noTeamId = { status: r3.status, body: await r3.json() };
    } catch (e: any) { results.test3_noTeamId = { error: e.message }; }

    // Test 4: GET project info to verify access
    try {
        const r4 = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}?teamId=${TEAM_ID}`, {
            method: 'GET', headers
        });
        results.test4_getProject = { status: r4.status, body: await r4.json() };
    } catch (e: any) { results.test4_getProject = { error: e.message }; }

    return NextResponse.json({ TOKEN_PREVIEW: TOKEN.substring(0, 15) + '...', PROJECT_ID, TEAM_ID, results });
}
