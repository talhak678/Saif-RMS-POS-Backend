import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { customerSchema } from '@/lib/validations/customer'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const customers = await prisma.customer.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: {
                _count: { select: { orders: true } }
            },
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(customers)
    } catch (error: any) {
        return errorResponse('Failed to fetch customers', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = customerSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const customer = await prisma.customer.create({
            data: validation.data,
        })

        return successResponse(customer, 'Customer created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Customer email already exists')
        return errorResponse('Failed to create customer', error.message, 500)
    }
})
