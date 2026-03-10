import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const verifySchema = z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    restaurantId: z.string()
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = verifySchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { email, otp, restaurantId } = validation.data

        const customer = await prisma.customer.findFirst({
            where: {
                email,
                restaurantId
            }
        })

        if (!customer) {
            return errorResponse('Customer not found', null, 404)
        }

        if (customer.isEmailVerified) {
            return errorResponse('Account already verified', null, 400)
        }

        if (customer.emailOtp !== otp) {
            return errorResponse('Invalid verification code', null, 400)
        }

        if (customer.otpExpiresAt && new Date() > customer.otpExpiresAt) {
            return errorResponse('Verification code has expired', null, 400)
        }

        // Mark as verified and clear OTP
        const updatedCustomer = await prisma.customer.update({
            where: { id: customer.id },
            data: {
                isEmailVerified: true,
                emailOtp: null,
                otpExpiresAt: null
            } as any
        })

        // Generate JWT for Customer (Same as Login)
        const SECRET_KEY = new TextEncoder().encode(
            process.env.JWT_SECRET || "default_secret_key_change_me"
        );
        const { SignJWT } = await import('jose')
        const { cookies } = await import('next/headers')

        const token = await new SignJWT({
            customerId: updatedCustomer.id,
            email: updatedCustomer.email,
            role: 'Customer',
            restaurantId: updatedCustomer.restaurantId
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

        const { password: _, emailOtp: __, otpExpiresAt: ___, ...sanitized } = updatedCustomer as any
        return successResponse({ ...sanitized, token }, 'Account verified successfully!', 200)

    } catch (error: any) {
        console.error('Verification Error:', error)
        return errorResponse('Verification failed', error.message, 500)
    }
}
