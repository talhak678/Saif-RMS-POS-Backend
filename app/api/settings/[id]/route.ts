import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const settingSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const setting = await prisma.setting.findUnique({
            where: { id },
            include: { restaurant: true }
        })
        if (!setting) return errorResponse('Setting not found', null, 404)
        return successResponse(setting)
    } catch (error: any) {
        return errorResponse('Failed to fetch setting', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = settingSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const setting = await prisma.setting.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(setting, 'Setting updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Setting not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Setting key already exists for this restaurant')
        return errorResponse('Failed to update setting', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.setting.delete({ where: { id } })
        return successResponse(null, 'Setting deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Setting not found', null, 404)
        return errorResponse('Failed to delete setting', error.message, 500)
    }
}
