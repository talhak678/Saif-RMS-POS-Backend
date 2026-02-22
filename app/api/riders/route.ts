import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { riderSchema } from '@/lib/validations/marketing'
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

        const status = searchParams.get('status');

        const riders = await prisma.rider.findMany({
            where: {
                ...(restaurantId ? { restaurantId } : {}),
                ...(status ? { status: status as any } : {})
            },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(riders)
    } catch (error: any) {
        return errorResponse('Failed to fetch riders', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = riderSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const rider = await prisma.rider.create({
            data: validation.data
        })
        return successResponse(rider, 'Rider created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create rider', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] })
