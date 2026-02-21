import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ingredientSchema } from '@/lib/validations/inventory'
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

        const ingredients = await prisma.ingredient.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: {
                _count: { select: { stocks: true, recipes: true } }
            }
        })
        return successResponse(ingredients)
    } catch (error: any) {
        return errorResponse('Failed to fetch ingredients', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = ingredientSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const ingredient = await prisma.ingredient.create({
            data: validation.data
        })

        return successResponse(ingredient, 'Ingredient created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create ingredient', error.message, 500)
    }
})
