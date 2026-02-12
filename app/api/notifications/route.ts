import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const notificationSchema = z.object({
    userId: z.string().cuid('Invalid user ID'),
    message: z.string().min(1, 'Message is required'),
    isRead: z.boolean().default(false),
})

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        const notifications = await prisma.notification.findMany({
            where: userId ? { userId } : {},
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(notifications)
    } catch (error: any) {
        return errorResponse('Failed to fetch notifications', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = notificationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const notification = await prisma.notification.create({
            data: validation.data
        })
        return successResponse(notification, 'Notification created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create notification', error.message, 500)
    }
}
