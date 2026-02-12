import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const loyaltyTrxSchema = z.object({
    points: z.number().int('Points must be an integer'),
    type: z.enum(['EARNED', 'REDEEMED']),
    customerId: z.string().cuid('Invalid customer ID'),
})

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const customerId = searchParams.get('customerId')

        const loyaltyTrxs = await prisma.loyaltyTrx.findMany({
            where: customerId ? { customerId } : {},
            include: { customer: true },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(loyaltyTrxs)
    } catch (error: any) {
        return errorResponse('Failed to fetch loyalty transactions', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = loyaltyTrxSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { customerId, points, type } = validation.data

        // Update customer loyalty points and create transaction
        const result = await prisma.$transaction(async (tx) => {
            const pointsChange = type === 'EARNED' ? points : -points

            await tx.customer.update({
                where: { id: customerId },
                data: {
                    loyaltyPoints: { increment: pointsChange }
                }
            })

            const trx = await tx.loyaltyTrx.create({
                data: validation.data,
                include: { customer: true }
            })

            return trx
        })

        return successResponse(result, 'Loyalty transaction created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create loyalty transaction', error.message, 500)
    }
}
