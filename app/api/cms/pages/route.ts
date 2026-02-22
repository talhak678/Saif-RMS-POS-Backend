import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { cmsPageSchema } from '@/lib/validations/cms'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const pages = await prisma.cmsPage.findMany({
            where: restaurantId ? { restaurantId } : {},
        })
        return successResponse(pages)
    } catch (error: any) {
        return errorResponse('Failed to fetch pages', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = cmsPageSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const page = await prisma.cmsPage.create({
            data: validation.data
        })
        return successResponse(page, 'Page created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Slug already exists for this restaurant')
        return errorResponse('Failed to create page', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN','Merchant Admin','Manager'] })
