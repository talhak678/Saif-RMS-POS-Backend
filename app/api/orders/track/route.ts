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
        const restaurantId = searchParams.get('restaurantId')
        const orderId = searchParams.get('orderId') // Direct ID lookup

        // Direct lookup by orderId (most reliable, no slug needed)
        if (orderId) {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                include: {
                    items: { include: { menuItem: { select: { name: true, image: true, price: true } } } },
                    payment: { select: { method: true, status: true, amount: true } },
                    customer: { select: { name: true, phone: true, email: true } },
                    branch: { select: { name: true, address: true, phone: true } },
                    rider: { select: { name: true, phone: true } },
                    review: { select: { rating: true, comment: true } }
                }
            })
            if (!order) return errorResponse('Order not found.', null, 404)
            return successResponse(order)
        }

        if (!orderNo || !phone) {
            return errorResponse('Order number and phone are required', null, 400)
        }

        // Build customer filter - try restaurantId first (most reliable), then slug, then no filter
        const customerFilter: any = {
            OR: [
                { phone: phone },
                { phone: { endsWith: phone.slice(-10) } }
            ]
        }

        if (restaurantId) {
            customerFilter.restaurantId = restaurantId
        } else if (restaurantSlug) {
            customerFilter.restaurant = { slug: restaurantSlug }
        }
        // If neither provided, match by orderNo + phone only (safe enough for public tracking)

        const order = await prisma.order.findFirst({
            where: {
                orderNo: parseInt(orderNo),
                customer: customerFilter
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

