import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

// Public discount code validation
export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { code, restaurantId, subtotal } = body

        if (!code || !restaurantId) {
            return errorResponse('Code and restaurantId are required', null, 400)
        }

        const discount = await prisma.discountCode.findFirst({
            where: {
                code: code.toUpperCase().trim(),
                restaurantId,
                isActive: true,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        })

        if (!discount) {
            return errorResponse('Invalid or expired discount code', null, 404)
        }

        // Calculate discount amount
        let discountAmount = 0
        if (discount.percentage && subtotal) {
            discountAmount = subtotal * (discount.percentage / 100)
        } else if (discount.amount) {
            discountAmount = discount.amount
        }

        return successResponse({
            id: discount.id,
            code: discount.code,
            percentage: discount.percentage,
            amount: discount.amount,
            discountAmount: Math.min(discountAmount, subtotal || Infinity),
            expiresAt: discount.expiresAt
        }, 'Discount code applied successfully')
    } catch (error: any) {
        return errorResponse('Failed to validate discount code', error.message, 500)
    }
}
