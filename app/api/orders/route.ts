import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { orderCreateSchema } from '@/lib/validations/order'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const status = searchParams.get('status') as OrderStatus | null
        const customerId = searchParams.get('customerId')

        const orders = await prisma.order.findMany({
            where: {
                ...(branchId && { branchId }),
                ...(status && { status }),
                ...(customerId && { customerId }),
            },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: true
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(orders)
    } catch (error: any) {
        return errorResponse('Failed to fetch orders', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = orderCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { branchId, customerId, type, items, paymentMethod, total } = validation.data

        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    branchId,
                    customerId,
                    type,
                    total,
                    status: OrderStatus.PENDING,
                    items: {
                        create: items.map((item: any) => ({
                            menuItemId: item.menuItemId,
                            quantity: item.quantity,
                            price: item.price,
                        })),
                    },
                },
            })

            await tx.payment.create({
                data: {
                    orderId: order.id,
                    amount: total,
                    method: paymentMethod || PaymentMethod.CASH,
                    status: PaymentStatus.PENDING,
                },
            })

            return order
        })

        const fullOrder = await prisma.order.findUnique({
            where: { id: result.id },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true
            }
        })

        return successResponse(fullOrder, 'Order placed successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to place order', error.message, 500)
    }
}
