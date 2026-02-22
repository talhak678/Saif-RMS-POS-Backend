import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { discountCodeSchema } from '@/lib/validations/marketing'
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

        const discounts = await prisma.discountCode.findMany({
            where: restaurantId ? { restaurantId } : {},
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(discounts)
    } catch (error: any) {
        return errorResponse('Failed to fetch discount codes', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = discountCodeSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const discount = await prisma.discountCode.create({
            data: validation.data
        })

        return successResponse(discount, 'Discount code created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Discount code already exists')
        return errorResponse('Failed to create discount code', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] })
