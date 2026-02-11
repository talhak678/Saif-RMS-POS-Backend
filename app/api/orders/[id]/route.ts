import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { orderUpdateSchema } from '@/lib/validations/order'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: true
            },
        })

        if (!order) return errorResponse('Order not found', null, 404)
        return successResponse(order)
    } catch (error: any) {
        return errorResponse('Failed to fetch order', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = orderUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { status, paymentStatus } = validation.data

        const order = await prisma.order.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(paymentStatus && {
                    payment: {
                        update: { status: paymentStatus }
                    }
                })
            },
            include: {
                payment: true,
                items: true,
                customer: true
            }
        })

        return successResponse(order, 'Order updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Order not found', null, 404)
        return errorResponse('Failed to update order', error.message, 500)
    }
}
