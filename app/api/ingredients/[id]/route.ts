import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ingredientSchema } from '@/lib/validations/inventory'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const ingredient = await prisma.ingredient.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            },
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
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.ingredient.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Ingredient not found or unauthorized', null, 404)

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
        return errorResponse('Failed to update ingredient', error.message, 500)
    }
})

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.ingredient.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Ingredient not found or unauthorized', null, 404)

        await prisma.ingredient.delete({ where: { id } })
        return successResponse(null, 'Ingredient deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete ingredient', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN', 'Manager'] })
