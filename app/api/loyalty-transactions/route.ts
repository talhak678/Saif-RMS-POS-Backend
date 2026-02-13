import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const customerId = searchParams.get('customerId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const loyaltyTrxs = await prisma.loyaltyTrx.findMany({
            where: {
                AND: [
                    customerId ? { customerId } : {},
                    restaurantId ? { customer: { restaurantId } } : {}
                ]
            },
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(loyaltyTrxs)
    } catch (error: any) {
        return errorResponse('Failed to fetch loyalty transactions', error.message, 500)
    }
})

// POST handled similarly with ownership check
export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const { customerId, points, type } = body

        // Security check: Verify customer belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                select: { restaurantId: true }
            })
            if (!customer || customer.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized customer for this loyalty transaction', null, 403)
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const pointsChange = type === 'EARNED' ? points : -points

            await tx.customer.update({
                where: { id: customerId },
                data: {
                    loyaltyPoints: { increment: pointsChange }
                }
            })

            const trx = await tx.loyaltyTrx.create({
                data: { customerId, points, type },
                include: { customer: true }
            })

            return trx
        })

        return successResponse(result, 'Loyalty transaction created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create loyalty transaction', error.message, 500)
    }
})
