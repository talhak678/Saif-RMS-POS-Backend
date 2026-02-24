import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionPriceUpdateSchema } from '@/lib/validations/subscription-price'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const price = await (prisma as any).subscriptionPrice.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        if (!price) return errorResponse('Subscription price not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized to view this pricing', null, 403)
        }

        return successResponse(price)
    } catch (error: any) {
        return errorResponse('Failed to fetch subscription price', error.message, 500)
    }
})

export const PUT = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = subscriptionPriceUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const existing = await (prisma as any).subscriptionPrice.findUnique({ where: { id } })
        if (!existing) return errorResponse('Subscription price not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized to update this pricing', null, 403)
        }

        const updated = await (prisma as any).subscriptionPrice.update({
            where: { id },
            data: validation.data,
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        // Sync changes to the restaurant record
        const { plan, billingCycle, restaurantId } = updated
        const startDate = new Date()
        const endDate = new Date()
        if (billingCycle === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1)
        } else if (billingCycle === 'YEARLY') {
            endDate.setFullYear(endDate.getFullYear() + 1)
        }

        await prisma.restaurant.update({
            where: { id: restaurantId },
            data: {
                subscription: plan,
                subStartDate: startDate,
                subEndDate: endDate
            }
        })

        return successResponse(updated, 'Subscription price updated successfully')
    } catch (error: any) {
        if (error.code === 'P2002') {
            return errorResponse('A pricing entry for this plan and billing cycle already exists for this restaurant', null, 409)
        }
        return errorResponse('Failed to update subscription price', error.message, 500)
    }
})

export const DELETE = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const existing = await (prisma as any).subscriptionPrice.findUnique({ where: { id } })
        if (!existing) return errorResponse('Subscription price not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized to delete this pricing', null, 403)
        }

        await (prisma as any).subscriptionPrice.delete({ where: { id } })

        return successResponse(null, 'Subscription price deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete subscription price', error.message, 500)
    }
})
