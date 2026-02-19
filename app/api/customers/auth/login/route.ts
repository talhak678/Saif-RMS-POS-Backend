import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { comparePassword } from '@/lib/auth-utils'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
);

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
    restaurantId: z.string().cuid('Invalid restaurant ID')
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = loginSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, password, restaurantId } = validation.data

        const customer = await prisma.customer.findFirst({
            where: {
                email,
                restaurantId
            }
        })

        if (!customer || !(customer as any).password || !(await comparePassword(password, (customer as any).password))) {
            return errorResponse('Invalid credentials', null, 401)
        }

        // Generate JWT for Customer
        const token = await new SignJWT({
            customerId: customer.id,
            email: customer.email,
            role: 'Customer',
            restaurantId: customer.restaurantId
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(SECRET_KEY)

        // Set Cookie
        const cookieStore = await cookies()
        cookieStore.set('customer_token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        })

        const { password: _, ...sanitized } = customer as any
        return successResponse({ ...sanitized, token }, 'Login successful')
    } catch (error: any) {
        console.error('Login Error:', error)
        return errorResponse('Login failed', error.message, 500)
    }
}
