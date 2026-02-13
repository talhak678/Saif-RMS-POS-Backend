import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { promoBannerSchema } from '@/lib/validations/cms'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const banners = await prisma.promoBanner.findMany({
            where: {
                AND: [
                    restaurantId ? { restaurantId } : {},
                    { isActive: true }
                ]
            }
        })
        return successResponse(banners)
    } catch (error: any) {
        return errorResponse('Failed to fetch banners', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = promoBannerSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const banner = await prisma.promoBanner.create({
            data: validation.data
        })
        return successResponse(banner, 'Banner created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create banner', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })
