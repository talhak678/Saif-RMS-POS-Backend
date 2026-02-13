import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
)

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Only apply to /api routes
    if (!pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    // Public routes that don't need authentication
    const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
    ]

    // Allow public routes
    if (publicRoutes.some(route => pathname === route)) {
        return NextResponse.next()
    }

    // Check for token in cookies
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Authentication required' },
            { status: 401 }
        )
    }

    try {
        await jwtVerify(token, SECRET_KEY)
        return NextResponse.next()
    } catch (error) {
        return NextResponse.json(
            { success: false, message: 'Invalid or expired token' },
            { status: 401 }
        )
    }
}

export const config = {
    matcher: ['/api/:path*'],
}
