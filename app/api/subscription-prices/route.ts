import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionPriceSchema } from '@/lib/validations/subscription-price'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

        // If not super admin, they can only see their own restaurant's pricing
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId) {
            if (restaurantId && restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized to view other restaurant pricing', null, 403)
            }
        }

        const effectiveRestaurantId = auth.role === 'SUPER_ADMIN' ? restaurantId : auth.restaurantId

        const prices = await (prisma as any).subscriptionPrice.findMany({
            where: {
                ...(effectiveRestaurantId ? { restaurantId: effectiveRestaurantId } : {}),
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(prices)
    } catch (error: any) {
        return errorResponse('Failed to fetch subscription prices', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = subscriptionPriceSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { restaurantId, plan, price, billingCycle, isActive } = validation.data

        // Only Super Admin can create pricing for any restaurant
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId !== restaurantId) {
            return errorResponse('Unauthorized to create pricing for this restaurant', null, 403)
        }

        const subscriptionPrice = await (prisma as any).subscriptionPrice.create({
            data: {
                restaurantId,
                plan,
                price,
                billingCycle,
                isActive,
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        return successResponse(subscriptionPrice, 'Subscription price created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return errorResponse('A pricing entry for this plan and billing cycle already exists for this restaurant', null, 409)
        }
        return errorResponse('Failed to create subscription price', error.message, 500)
    }
})
