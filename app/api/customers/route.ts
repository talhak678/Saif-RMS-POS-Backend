import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { customerSchema } from '@/lib/validations/customer'

export async function GET() {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                _count: { select: { orders: true } }
            },
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(customers)
    } catch (error: any) {
        return errorResponse('Failed to fetch customers', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = customerSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, phone } = validation.data

        const customer = await prisma.customer.create({
            data: { name, email, phone },
        })

        return successResponse(customer, 'Customer created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Customer email already exists')
        return errorResponse('Failed to create customer', error.message, 500)
    }
}
