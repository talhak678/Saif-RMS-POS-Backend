import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { recipeSchema } from '@/lib/validations/inventory'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: { menuItem: true, ingredient: true }
        })
        if (!recipe) return errorResponse('Recipe not found', null, 404)
        return successResponse(recipe)
    } catch (error: any) {
        return errorResponse('Failed to fetch recipe', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = recipeSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const recipe = await prisma.recipe.update({
            where: { id },
            data: validation.data,
            include: { menuItem: true, ingredient: true }
        })
        return successResponse(recipe, 'Recipe updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Recipe not found', null, 404)
        return errorResponse('Failed to update recipe', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.recipe.delete({ where: { id } })
        return successResponse(null, 'Recipe deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Recipe not found', null, 404)
        return errorResponse('Failed to delete recipe', error.message, 500)
    }
}
