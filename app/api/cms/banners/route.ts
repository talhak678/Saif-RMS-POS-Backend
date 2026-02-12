import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { promoBannerSchema } from '@/lib/validations/cms'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')
        const banners = await prisma.promoBanner.findMany({
            where: {
                ...(restaurantId && { restaurantId }),
                isActive: true
            },
            include: { restaurant: true }
        })
        return successResponse(banners)
    } catch (error: any) {
        return errorResponse('Failed to fetch banners', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = promoBannerSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const banner = await prisma.promoBanner.create({
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(banner, 'Banner created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create banner', error.message, 500)
    }
}
