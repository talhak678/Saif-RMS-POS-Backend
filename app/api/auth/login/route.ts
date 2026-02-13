import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { userLoginSchema } from '@/lib/validations/user'
import { comparePassword } from '@/lib/auth-utils'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = userLoginSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, password } = validation.data

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                role: true,
                restaurant: true
            }
        })

        if (!user || !(await comparePassword(password, user.password))) {
            return errorResponse('Invalid credentials', null, 401)
        }

        // Generate JWT
        const token = await new SignJWT({
            userId: user.id,
            email: user.email,
            role: user.role.name,
            restaurantId: user.restaurantId
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(SECRET_KEY)

        // Set Cookie
        const cookieStore = await cookies()
        cookieStore.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
        })

        const { password: _, ...sanitizedUser } = user
        return successResponse(sanitizedUser, 'Login successful')
    } catch (error: any) {
        return errorResponse('Login failed', error.message, 500)
    }
}
