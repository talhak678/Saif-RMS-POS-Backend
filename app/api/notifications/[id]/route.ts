import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/with-auth'

const notificationUpdateSchema = z.object({
    message: z.string().min(1, 'Message is required').optional(),
    isRead: z.boolean().optional(),
})

export const GET = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const notification = await prisma.notification.findUnique({ where: { id } })

        if (!notification) return errorResponse('Notification not found', null, 404)

        // Security check: Only the owner or Super Admin can view
        if (auth.role !== 'SUPER_ADMIN' && notification.userId !== auth.userId) {
            return errorResponse('Unauthorized to view this notification', null, 403)
        }

        return successResponse(notification)
    } catch (error: any) {
        return errorResponse('Failed to fetch notification', error.message, 500)
    }
})

export const PATCH = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const body = await req.json()

        const notification = await prisma.notification.findUnique({ where: { id } })
        if (!notification) return errorResponse('Notification not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN' && notification.userId !== auth.userId) {
            return errorResponse('Unauthorized to update this notification', null, 403)
        }

        const validation = notificationUpdateSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: validation.data
        })

        return successResponse(updated, 'Notification updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update notification', error.message, 500)
    }
})

export const DELETE = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const notification = await prisma.notification.findUnique({ where: { id } })
        if (!notification) return errorResponse('Notification not found', null, 404)

        // Security check
        if (auth.role !== 'SUPER_ADMIN' && notification.userId !== auth.userId) {
            return errorResponse('Unauthorized to delete this notification', null, 403)
        }

        await prisma.notification.delete({ where: { id } })
        return successResponse(null, 'Notification deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete notification', error.message, 500)
    }
})
