import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'


export const GET = async (req: NextRequest) => {
    try {
        const prices = await (prisma as any).subscriptionPrice.findMany({
            where: {
                isActive: true,
                isDefault: true,
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(prices, 'Public subscription prices fetched successfully')
    } catch (error: any) {
        return errorResponse('Failed to fetch public subscription prices', error.message, 500)
    }
}
