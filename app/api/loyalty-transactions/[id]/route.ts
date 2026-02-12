import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const loyaltyTrx = await prisma.loyaltyTrx.findUnique({
            where: { id },
            include: { customer: true }
        })
        if (!loyaltyTrx) return errorResponse('Loyalty transaction not found', null, 404)
        return successResponse(loyaltyTrx)
    } catch (error: any) {
        return errorResponse('Failed to fetch loyalty transaction', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get transaction details before deleting
        const trx = await prisma.loyaltyTrx.findUnique({ where: { id } })
        if (!trx) return errorResponse('Loyalty transaction not found', null, 404)

        // Reverse points and delete transaction
        await prisma.$transaction(async (tx) => {
            const pointsChange = trx.type === 'EARNED' ? -trx.points : trx.points

            await tx.customer.update({
                where: { id: trx.customerId },
                data: {
                    loyaltyPoints: { increment: pointsChange }
                }
            })

            await tx.loyaltyTrx.delete({ where: { id } })
        })

        return successResponse(null, 'Loyalty transaction deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Loyalty transaction not found', null, 404)
        return errorResponse('Failed to delete loyalty transaction', error.message, 500)
    }
}
