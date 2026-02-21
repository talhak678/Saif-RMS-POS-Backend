import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/with-auth'

const notificationSchema = z.object({
    userId: z.string().cuid('Invalid user ID'),
    message: z.string().min(1, 'Message is required'),
    isRead: z.boolean().default(false),
})

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let userId = auth.userId;

        // Super Admin can see notifications of other users
        if (auth.role === 'SUPER_ADMIN') {
            const queryUserId = searchParams.get('userId')
            if (queryUserId) userId = queryUserId;
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(notifications)
    } catch (error: any) {
        return errorResponse('Failed to fetch notifications', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // If not super admin, you can only send notifications to users in YOUR restaurant
        const validation = notificationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        if (auth.role !== 'SUPER_ADMIN') {
            const targetUser = await prisma.user.findUnique({
                where: { id: validation.data.userId },
                select: { restaurantId: true }
            })
            if (!targetUser || targetUser.restaurantId !== auth.restaurantId) {
                return errorResponse('Cannot send notification to user outside your restaurant', null, 403)
            }
        }

        const notification = await prisma.notification.create({
            data: validation.data
        })
        return successResponse(notification, 'Notification created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create notification', error.message, 500)
    }
})
