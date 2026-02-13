import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { paymentSchema } from '@/lib/validations/payment'
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

        const payments = await prisma.payment.findMany({
            where: {
                ...(restaurantId ? { order: { branch: { restaurantId } } } : {})
            },
            include: { order: { include: { branch: true } } },
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(payments)
    } catch (error: any) {
        return errorResponse('Failed to fetch payments', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = paymentSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { orderId } = validation.data

        // Security check: Verify order belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: { branch: { select: { restaurantId: true } } }
            })
            if (!order || order.branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized order for this payment', null, 403)
            }
        }

        const payment = await prisma.payment.create({
            data: validation.data,
            include: { order: true },
        })
        return successResponse(payment, 'Payment recorded successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Payment for this order already exists')
        return errorResponse('Failed to record payment', error.message, 500)
    }
})
