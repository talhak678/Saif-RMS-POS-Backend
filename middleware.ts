import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {

    // Only intercept API routes
    if (request.nextUrl.pathname.startsWith('/api')) {
        const origin = request.headers.get('origin') || '*'

        // Handle Preflight (OPTIONS) requests
        if (request.method === 'OPTIONS') {
            return new NextResponse(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
                    'Access-Control-Allow-Credentials': 'true',
                },
            })
        }

        // Handle standard requests
        const response = NextResponse.next()

        // Apply CORS headers to response
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version')
        response.headers.set('Access-Control-Allow-Credentials', 'true')

        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
