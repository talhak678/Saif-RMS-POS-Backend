import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { promises as dns } from 'dns'
import prisma from '@/lib/prisma'
import { getDomainConfigFromVercel } from '@/lib/vercel'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const domain = searchParams.get('domain')
        const restaurantId = searchParams.get('restaurantId')

        if (!domain) {
            return errorResponse('Domain parameter is required', null, 400)
        }

        // Clean domain
        const cleanDomain = domain.replace(/^(https?:\/\/)/, '').replace(/\/$/, '').replace(/^www\./, '')

        console.log(`🔍 Verifying domain: ${cleanDomain}`)

        // Expected values
        const expectedIp = "76.76.21.21"
        const expectedCname = "saif-rms-pos-website.vercel.app"

        let dnsIpMatches = false
        let dnsCnameMatches = false
        let dnsARecords: string[] = []
        let dnsCnameRecords: string[] = []

        // --- Step 1: DNS Check (direct DNS resolution) ---
        try {
            const addresses = await dns.resolve4(cleanDomain)
            dnsARecords = addresses
            dnsIpMatches = addresses.includes(expectedIp)
            console.log(`📌 A Records: ${addresses.join(', ')} | Match: ${dnsIpMatches}`)
        } catch (e) {
            console.log(`⚠️ No A records found for ${cleanDomain}`)
        }

        try {
            const cnames = await dns.resolveCname(`www.${cleanDomain}`)
            dnsCnameRecords = cnames
            dnsCnameMatches = cnames.some((c: string) => c.includes(expectedCname))
            console.log(`📌 CNAME Records (www): ${cnames.join(', ')} | Match: ${dnsCnameMatches}`)
        } catch (e) {
            console.log(`⚠️ No CNAME records found for www.${cleanDomain}`)
        }

        // --- Step 2: Vercel Domain Config Check ---
        let vercelStatus: any = null
        try {
            vercelStatus = await getDomainConfigFromVercel(cleanDomain)
            console.log(`📋 Vercel config check:`, JSON.stringify(vercelStatus))
        } catch (e) {
            console.log(`⚠️ Vercel config check failed`)
        }

        // --- Step 3: Determine overall status ---
        const dnsValid = dnsIpMatches || dnsCnameMatches
        const vercelConfigured = vercelStatus?.isConfigured || false
        const isFullyVerified = dnsValid && vercelConfigured

        // Partial states for better UX messaging
        let status: 'VERIFIED' | 'PENDING' | 'FAILED' | 'DNS_OK_VERCEL_PENDING' | 'DNS_PENDING' = 'PENDING'

        if (isFullyVerified) {
            status = 'VERIFIED'
        } else if (dnsValid && !vercelConfigured) {
            status = 'DNS_OK_VERCEL_PENDING'
        } else if (!dnsValid) {
            status = 'DNS_PENDING'
        }

        // --- Step 4: Update restaurant status in DB if restaurantId provided ---
        if (restaurantId) {
            const dbStatus = isFullyVerified ? 'VERIFIED' : (dnsValid ? 'PENDING' : 'PENDING')
            try {
                await prisma.restaurant.update({
                    where: { id: restaurantId },
                    data: { domainStatus: dbStatus }
                })
                console.log(`✅ Updated restaurant domain status to: ${dbStatus}`)
            } catch (e) {
                console.log(`⚠️ Failed to update restaurant status`)
            }
        }

        return successResponse({
            domain: cleanDomain,
            status,
            isFullyVerified,
            dns: {
                aRecordMatches: dnsIpMatches,
                cnameMatches: dnsCnameMatches,
                aRecords: dnsARecords,
                cnameRecords: dnsCnameRecords,
                expectedIp,
                expectedCname,
            },
            vercel: {
                isConfigured: vercelConfigured,
                conflicts: vercelStatus?.conflicts || [],
                details: vercelStatus?.config || null,
            },
            message: isFullyVerified
                ? '🎉 Domain is fully configured and active!'
                : dnsValid
                    ? '⏳ DNS records look correct! Vercel is still processing. Wait a few minutes.'
                    : '⚠️ DNS records not found yet. Please add the A and CNAME records and wait up to 24-48 hours.'
        })
    } catch (error: any) {
        console.error('💥 Error verifying domain:', error)
        return errorResponse('Failed to verify domain', error.message, 500)
    }
}
