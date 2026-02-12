import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { paymentSchema } from '@/lib/validations/payment'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const payment = await prisma.payment.findUnique({
            where: { id },
            include: { order: { include: { customer: true, branch: true, items: true } } }
        })
        if (!payment) return errorResponse('Payment not found', null, 404)
        return successResponse(payment)
    } catch (error: any) {
        return errorResponse('Failed to fetch payment', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = paymentSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const payment = await prisma.payment.update({
            where: { id },
            data: validation.data,
            include: { order: true }
        })
        return successResponse(payment, 'Payment updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Payment not found', null, 404)
        return errorResponse('Failed to update payment', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.payment.delete({ where: { id } })
        return successResponse(null, 'Payment deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Payment not found', null, 404)
        return errorResponse('Failed to delete payment', error.message, 500)
    }
}
