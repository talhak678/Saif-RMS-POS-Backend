import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ingredientSchema } from '@/lib/validations/inventory'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const ingredient = await prisma.ingredient.findUnique({
            where: { id },
            include: {
                recipes: { include: { menuItem: true } },
                stocks: { include: { branch: true } }
            }
        })
        if (!ingredient) return errorResponse('Ingredient not found', null, 404)
        return successResponse(ingredient)
    } catch (error: any) {
        return errorResponse('Failed to fetch ingredient', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = ingredientSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const ingredient = await prisma.ingredient.update({
            where: { id },
            data: validation.data
        })
        return successResponse(ingredient, 'Ingredient updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Ingredient not found', null, 404)
        return errorResponse('Failed to update ingredient', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.ingredient.delete({ where: { id } })
        return successResponse(null, 'Ingredient deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Ingredient not found', null, 404)
        return errorResponse('Failed to delete ingredient', error.message, 500)
    }
}
