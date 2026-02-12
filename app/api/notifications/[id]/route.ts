import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const notificationSchema = z.object({
    userId: z.string().cuid('Invalid user ID'),
    message: z.string().min(1, 'Message is required'),
    isRead: z.boolean().default(false),
})

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const notification = await prisma.notification.findUnique({ where: { id } })
        if (!notification) return errorResponse('Notification not found', null, 404)
        return successResponse(notification)
    } catch (error: any) {
        return errorResponse('Failed to fetch notification', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = notificationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const notification = await prisma.notification.update({
            where: { id },
            data: validation.data
        })
        return successResponse(notification, 'Notification updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Notification not found', null, 404)
        return errorResponse('Failed to update notification', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.notification.delete({ where: { id } })
        return successResponse(null, 'Notification deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Notification not found', null, 404)
        return errorResponse('Failed to delete notification', error.message, 500)
    }
}
