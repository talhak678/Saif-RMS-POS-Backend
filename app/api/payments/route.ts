import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { paymentSchema } from '@/lib/validations/payment'

export async function GET() {
    try {
        const payments = await prisma.payment.findMany({
            include: { order: true },
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(payments)
    } catch (error: any) {
        return errorResponse('Failed to fetch payments', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = paymentSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
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
}
