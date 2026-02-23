import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { customerSchema } from '@/lib/validations/customer'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const customers = await prisma.customer.findMany({
            where: {
                ...(restaurantId ? { restaurantId } : {})
            },
            include: {
                _count: { select: { orders: true } },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        // Flatten lastOrderAt to top-level for easy frontend use
        const result = customers.map(c => ({
            ...c,
            lastOrderAt: c.orders[0]?.createdAt ?? null,
            orders: undefined, // don't send full order objects
        }))

        return successResponse(result)
    } catch (error: any) {
        return errorResponse('Failed to fetch customers', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
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
