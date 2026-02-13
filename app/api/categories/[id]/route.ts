import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { categorySchema } from '@/lib/validations/category'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const category = await prisma.category.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            },
            include: { menuItems: true }
        })

        if (!category) return errorResponse('Category not found', null, 404)
        return successResponse(category)
    } catch (error: any) {
        return errorResponse('Failed to fetch category', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;
        const body = await req.json()

        // Ensure restaurantId is injected
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = restaurantId;
        }

        const validation = categorySchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        // Check ownership
        const existing = await prisma.category.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            }
        })

        if (!existing) return errorResponse('Category not found or unauthorized', null, 404)

        const category = await prisma.category.update({
            where: { id },
            data: validation.data
        })

        return successResponse(category, 'Category updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update category', error.message, 500)
    }
})

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        // Check ownership
        const existing = await prisma.category.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            }
        })

        if (!existing) return errorResponse('Category not found or unauthorized', null, 404)

        await prisma.category.delete({ where: { id } })
        return successResponse(null, 'Category deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete category', error.message, 500)
    }
})
