import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { categorySchema } from '@/lib/validations/category'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        // If Super Admin, they can filter by any restaurantId, otherwise they get everything.
        // If regular user, they ONLY get their restaurantId.

        let restaurantId = auth.restaurantId;

        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined; // Super Admin sees all if no ID provided
        }

        const categories = await prisma.category.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: {
                _count: { select: { menuItems: true } }
            }
        })
        return successResponse(categories)
    } catch (error: any) {
        return errorResponse('Failed to fetch categories', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId from auth context if not Super Admin
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = categorySchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const category = await prisma.category.create({
            data: validation.data
        })

        return successResponse(category, 'Category created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create category', error.message, 500)
    }
})
