import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

// Public endpoint: Track order by order number + phone (no auth required)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const orderNo = searchParams.get('orderNo')
        const phone = searchParams.get('phone')
        const restaurantSlug = searchParams.get('slug')

        if (!orderNo || !phone) {
            return errorResponse('Order number and phone are required', null, 400)
        }

        const order = await prisma.order.findFirst({
            where: {
                orderNo: parseInt(orderNo),
                customer: {
                    phone,
                    ...(restaurantSlug ? { restaurant: { slug: restaurantSlug } } : {})
                }
            },
            include: {
                items: { include: { menuItem: { select: { name: true, image: true, price: true } } } },
                payment: { select: { method: true, status: true, amount: true } },
                customer: { select: { name: true, phone: true, email: true } },
                branch: { select: { name: true, address: true, phone: true } },
                rider: { select: { name: true, phone: true } },
                review: { select: { rating: true, comment: true } }
            }
        })

        if (!order) {
            return errorResponse('Order not found. Please check your order number and phone.', null, 404)
        }

        return successResponse(order)
    } catch (error: any) {
        return errorResponse('Failed to track order', error.message, 500)
    }
}
