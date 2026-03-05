import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

// Normalize phone: strip all non-digits, return last 10 digits
function normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    return digits.slice(-10)
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const orderNo = searchParams.get('orderNo')
        const phone = searchParams.get('phone')
        const restaurantSlug = searchParams.get('slug')

        if (!orderNo || !phone) {
            return errorResponse('Order number and phone are required', null, 400)
        }

        const parsedOrderNo = parseInt(orderNo)
        if (isNaN(parsedOrderNo)) {
            return errorResponse('Invalid order number format', null, 400)
        }

        // 1. Find all orders with this orderNo and slug
        const orders = await prisma.order.findMany({
            where: {
                orderNo: parsedOrderNo,
                ...(restaurantSlug ? {
                    branch: { restaurant: { slug: restaurantSlug } }
                } : {})
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

        if (!orders || orders.length === 0) {
            return errorResponse('Order not found. Please check your order number and restaurant.', null, 404)
        }

        // 2. Perform normalized phone matching
        const normalizedEnteredPhone = normalizePhone(phone)
        const matchedOrder = orders.find(order => {
            const storedPhone = order.customer?.phone || ''
            if (!storedPhone) return false
            return normalizePhone(storedPhone) === normalizedEnteredPhone
        })

        if (!matchedOrder) {
            return errorResponse('Security Check: Phone number does not match this order No.', null, 404)
        }

        return successResponse(matchedOrder)
    } catch (error: any) {
        return errorResponse('Failed to track order', error.message, 500)
    }
}
