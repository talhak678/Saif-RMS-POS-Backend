import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reviewSchema } from '@/lib/validations/marketing'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('orderId')
        const menuItemId = searchParams.get('menuItemId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const reviews = await prisma.review.findMany({
            where: {
                AND: [
                    orderId ? { orderId } : {},
                    menuItemId ? { menuItemId } : {},
                    restaurantId ? { order: { branch: { restaurantId } } } : {}
                ]
            },
            include: {
                order: { include: { customer: true } },
                menuItem: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(reviews)
    } catch (error: any) {
        return errorResponse('Failed to fetch reviews', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = reviewSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { orderId } = validation.data

        // Security check: Verify order belongs to restaurant
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId) {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: { branch: { select: { restaurantId: true } } }
            })
            if (!order || order.branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized order for this review', null, 403)
            }
        }

        const review = await prisma.review.create({
            data: validation.data,
            include: { order: true, menuItem: true }
        })
        return successResponse(review, 'Review created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Review for this order already exists')
        return errorResponse('Failed to create review', error.message, 500)
    }
})
