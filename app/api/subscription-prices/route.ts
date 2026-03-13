import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionPriceSchema } from '@/lib/validations/subscription-price'
import { withAuth } from '@/lib/with-auth'

export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')
        const isDefault = searchParams.get('isDefault') === 'true'

        const prices = await (prisma as any).subscriptionPrice.findMany({
            where: {
                ...(restaurantId ? { restaurantId } : {}),
                ...(searchParams.has('isDefault') ? { isDefault } : {}),
                isActive: true
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
}

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = subscriptionPriceSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        let { restaurantId, plan, price, billingCycle, isActive, features, isDefault } = validation.data

        // Logic: if restaurantId is provided, it's NOT default. If not provided, it IS default.
        if (restaurantId) {
            isDefault = false;
        } else {
            isDefault = true;
            restaurantId = null as any; // Explicitly set to null for prisma if needed
        }

        // Only Super Admin can create default pricing or pricing for any restaurant
        if (auth.role !== 'SUPER_ADMIN') {
            if (isDefault || auth.restaurantId !== restaurantId) {
                return errorResponse('Unauthorized to create this pricing', null, 403)
            }
        }

        const subscriptionPrice = await (prisma as any).subscriptionPrice.create({
            data: {
                restaurantId: restaurantId || null,
                plan,
                price,
                billingCycle,
                isActive,
                isDefault,
                features: features ?? [],
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        // Also update the restaurant's active subscription status and dates if restaurantId exists
        if (restaurantId) {
            const startDate = new Date();
            const endDate = new Date();
            if (billingCycle === 'MONTHLY') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (billingCycle === 'YEARLY') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    subscription: plan,
                    subStartDate: startDate,
                    subEndDate: endDate
                }
            })
        }

        return successResponse(subscriptionPrice, 'Subscription price created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return errorResponse('A pricing entry for this plan and billing cycle already exists', null, 409)
        }
        return errorResponse('Failed to create subscription price', error.message, 500)
    }
})
