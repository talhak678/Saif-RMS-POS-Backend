import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const settingSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

        const settings = await prisma.setting.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: { restaurant: true }
        })
        return successResponse(settings)
    } catch (error: any) {
        return errorResponse('Failed to fetch settings', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = settingSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const setting = await prisma.setting.create({
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(setting, 'Setting created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Setting key already exists for this restaurant')
        return errorResponse('Failed to create setting', error.message, 500)
    }
}
