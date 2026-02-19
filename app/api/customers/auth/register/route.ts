import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth-utils'

const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    phone: z.string().optional().nullable(),
    restaurantId: z.string().cuid('Invalid restaurant ID')
})

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = registerSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, phone, restaurantId } = validation.data

        // Check if customer already exists for this restaurant
        const existing = await prisma.customer.findFirst({
            where: {
                email,
                restaurantId
            }
        })

        if (existing) {
            return errorResponse('Email already registered for this restaurant', null, 400)
        }

        const hashedPassword = await hashPassword(password)

        const customer = await prisma.customer.create({
            data: {
                name,
                email,
                password: hashedPassword,
                phone,
                restaurantId
            } as any
        })

        const { password: _, ...sanitized } = customer as any
        return successResponse(sanitized, 'Registration successful', 201)
    } catch (error: any) {
        console.error('Registration Error:', error)
        return errorResponse('Registration failed', error.message, 500)
    }
}
