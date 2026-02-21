import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { faqSchema } from '@/lib/validations/cms'
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

        const faqItems = await prisma.faqItem.findMany({
            where: restaurantId ? { restaurantId } : {},
        })
        return successResponse(faqItems)
    } catch (error: any) {
        return errorResponse('Failed to fetch FAQs', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = faqSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const faqItem = await prisma.faqItem.create({
            data: validation.data
        })
        return successResponse(faqItem, 'FAQ created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create FAQ', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN'] })
