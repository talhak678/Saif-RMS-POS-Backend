import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { getAuthContext } from '@/lib/auth'

const SECRET_KEY = new TextEncoder().encode(
    process.env.JWT_SECRET || "default_secret_key_change_me"
);

async function getCustomerFromToken(req: NextRequest) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    if (!token) {
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        token = cookieStore.get('customer_token')?.value || null
    }

    if (!token) return null

    try {
        const { payload } = await jwtVerify(token, SECRET_KEY)
        return payload as any
    } catch {
        return null
    }
}

// PUBLIC: GET reviews for a restaurant (no auth needed)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantSlug = searchParams.get('slug')
        let restaurantId = searchParams.get('restaurantId')
        const menuItemId = searchParams.get('menuItemId')
        const limit = parseInt(searchParams.get('limit') || '20')

        // 🚀 If no ID provided, try to get from Auth Context (Dashboard use-case)
        if (!restaurantSlug && !restaurantId) {
            const auth = await getAuthContext(req);
            if (auth?.restaurantId) {
                restaurantId = auth.restaurantId;
            }
        }

        if (!restaurantSlug && !restaurantId) {
            return errorResponse('Restaurant slug or restaurantId is required', null, 400)
        }

        const reviews = await prisma.review.findMany({
            where: {
                AND: [
                    {
                        order: {
                            branch: restaurantSlug
                                ? { restaurant: { slug: restaurantSlug } }
                                : { restaurantId: restaurantId! }
                        },
                    },
                    menuItemId ? {
                        OR: [
                            { menuItemId: menuItemId },
                            { order: { items: { some: { menuItemId: menuItemId } } } }
                        ]
                    } : {}
                ]
            },
            include: {
                order: { include: { customer: { select: { name: true } } } },
                menuItem: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit
        })

        // Calculate average rating
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : 0

        return successResponse({ reviews, avgRating, totalReviews: reviews.length })
    } catch (error: any) {
        return errorResponse('Failed to fetch reviews', error.message, 500)
    }
}

// POST: Submit review (requires customer JWT)
export async function POST(req: NextRequest) {
    try {
        const customer = await getCustomerFromToken(req)
        if (!customer?.customerId) {
            return errorResponse('Authentication required', null, 401)
        }

        const body = await req.json()
        const { orderId, rating, comment, menuItemId } = body

        if (!orderId || !rating) {
            return errorResponse('Order ID and rating are required', null, 400)
        }

        if (rating < 1 || rating > 5) {
            return errorResponse('Rating must be between 1 and 5', null, 400)
        }

        // Verify order belongs to this customer
        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                customerId: customer.customerId,
                status: 'DELIVERED'
            }
        })

        if (!order) {
            return errorResponse('Order not found or not yet delivered', null, 404)
        }

        const review = await prisma.review.create({
            data: {
                orderId,
                rating,
                comment: comment || null,
                menuItemId: menuItemId || null
            },
            include: {
                order: { include: { customer: { select: { name: true } } } },
                menuItem: { select: { name: true } }
            }
        })

        return successResponse(review, 'Review submitted successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('You have already reviewed this order')
        return errorResponse('Failed to submit review', error.message, 500)
    }
}
