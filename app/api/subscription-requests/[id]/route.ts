import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionRequestUpdateSchema } from '@/lib/validations/subscription-request'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const request = await prisma.subscriptionRequest.findUnique({
            where: { id },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        if (!request) return errorResponse('Subscription request not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId !== request.restaurantId) {
            return errorResponse('Unauthorized to view this request', null, 403)
        }

        return successResponse(request)
    } catch (error: any) {
        return errorResponse('Failed to fetch subscription request', error.message, 500)
    }
})

export const PUT = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = subscriptionRequestUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const existing = await prisma.subscriptionRequest.findUnique({ where: { id } })
        if (!existing) return errorResponse('Subscription request not found', null, 404)

        // Only Super Admin can approve/reject requests
        if (auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Unauthorized to update request status', null, 403)
        }

        const { status } = validation.data

        const updated = await prisma.subscriptionRequest.update({
            where: { id },
            data: { status },
            include: {
                restaurant: {
                    select: { id: true, name: true }
                }
            }
        })

        // If approved, you might want to automatically update the restaurant plan or just notify.
        // Usually, Super Admin would manually update the plan after approval/payment.

        // Notify the restaurant users about the status update
        const restaurantUsers = await prisma.user.findMany({
            where: { restaurantId: updated.restaurantId }
        })

        for (const user of restaurantUsers) {
            await prisma.notification.create({
                data: {
                    userId: user.id,
                    message: `Your subscription request for the ${updated.plan} plan has been ${status.toLowerCase()}.`,
                    isRead: false
                }
            })
        }

        return successResponse(updated, `Subscription request ${status.toLowerCase()} successfully`)
    } catch (error: any) {
        return errorResponse('Failed to update subscription request', error.message, 500)
    }
})

export const DELETE = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const existing = await prisma.subscriptionRequest.findUnique({ where: { id } })
        if (!existing) return errorResponse('Subscription request not found', null, 404)

        // Only Super Admin or User of the same restaurant can delete their PENDING request
        if (auth.role !== 'SUPER_ADMIN') {
            if (auth.restaurantId !== existing.restaurantId || existing.status !== 'PENDING') {
                return errorResponse('Unauthorized to delete this request', null, 403)
            }
        }

        await prisma.subscriptionRequest.delete({ where: { id } })

        return successResponse(null, 'Subscription request deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete subscription request', error.message, 500)
    }
})
