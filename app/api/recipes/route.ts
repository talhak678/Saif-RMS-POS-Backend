import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { recipeSchema } from '@/lib/validations/inventory'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const menuItemId = searchParams.get('menuItemId')
        const recipes = await prisma.recipe.findMany({
            where: menuItemId ? { menuItemId } : {},
            include: { menuItem: true, ingredient: true },
        })
        return successResponse(recipes)
    } catch (error: any) {
        return errorResponse('Failed to fetch recipes', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = recipeSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const recipe = await prisma.recipe.create({
            data: validation.data,
        })
        return successResponse(recipe, 'Recipe created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create recipe', error.message, 500)
    }
}
