import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { recipeSchema } from '@/lib/validations/inventory'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const menuItemId = searchParams.get('menuItemId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const recipes = await prisma.recipe.findMany({
            where: {
                AND: [
                    menuItemId ? { menuItemId } : {},
                    restaurantId ? { menuItem: { restaurantId } } : {}
                ]
            },
            include: { menuItem: true, ingredient: true },
        })
        return successResponse(recipes)
    } catch (error: any) {
        return errorResponse('Failed to fetch recipes', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = recipeSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { menuItemId } = validation.data

        // Security check: Verify menuItem belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: menuItemId },
                select: { restaurantId: true }
            })
            if (!menuItem || menuItem.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized menu item for this recipe', null, 403)
            }
        }

        const recipe = await prisma.recipe.create({
            data: validation.data,
        })
        return successResponse(recipe, 'Recipe created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create recipe', error.message, 500)
    }
})
