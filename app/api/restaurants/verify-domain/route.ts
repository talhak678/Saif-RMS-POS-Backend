import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { promises as dns } from 'dns'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const domain = searchParams.get('domain')

        if (!domain) {
            return errorResponse('Domain parameter is required', null, 400)
        }

        // Expected values
        const expectedIp = "76.76.21.21"
        const expectedCname = "saif-rms-pos-website.vercel.app"

        console.log(`🔍 Verifying DNS for domain: ${domain}`)

        let ipMatches = false
        let cnameMatches = false

        try {
            // Check A Record
            const addresses = await dns.resolve4(domain)
            ipMatches = addresses.includes(expectedIp)
            console.log(`✅ A Records found: ${addresses.join(', ')}`)
        } catch (e) {
            console.log(`⚠️ No A records found or error: `, e)
        }

        try {
            // Check CNAME Record for www
            if (domain.startsWith('www.')) {
                const cnames = await dns.resolveCname(domain)
                cnameMatches = cnames.some((c: string) => c.includes(expectedCname))
                console.log(`✅ CNAME Records found: ${cnames.join(', ')}`)
            } else {
                // If they provided root domain, we assume they should also check www
                const wwwCnames = await dns.resolveCname(`www.${domain}`)
                cnameMatches = wwwCnames.some((c: string) => c.includes(expectedCname))
                console.log(`✅ WWW CNAME Records found: ${wwwCnames.join(', ')}`)
            }
        } catch (e) {
            console.log(`⚠️ No CNAME records found or error: `, e)
        }

        const isValid = ipMatches || cnameMatches

        return successResponse({
            isValid,
            ipMatches,
            cnameMatches,
            domain
        })
    } catch (error: any) {
        console.error('💥 Error verifying domain:', error)
        return errorResponse('Failed to verify domain', error.message, 500)
    }
}
