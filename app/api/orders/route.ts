import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client'
import { orderCreateSchema } from '@/lib/validations/order'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const status = searchParams.get('status') as OrderStatus | null
        const customerId = searchParams.get('customerId')

        // Multi-tenancy logic
        let restaurantId = auth.restaurantId;
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const orders = await prisma.order.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    status ? { status } : {},
                    customerId ? { customerId } : {},
                    // Ensure the branch belongs to the user's restaurant
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: {
                items: { include: { menuItem: true } },
                payment: true,
                customer: true,
                branch: true,
                rider: true
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(orders)
    } catch (error: any) {
        return errorResponse('Failed to fetch orders', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = orderCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { branchId, customerId, type, items, paymentMethod, total } = validation.data

        // Security check: Verify the branchId belongs to the correct restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch for this order', null, 403)
            }
        }

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
})
