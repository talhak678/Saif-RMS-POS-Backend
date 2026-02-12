import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { categorySchema } from '@/lib/validations/category'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const category = await prisma.category.findUnique({
            where: { id },
            include: { menuItems: true }
        })

        if (!category) return errorResponse('Category not found', null, 404)
        return successResponse(category)
    } catch (error: any) {
        return errorResponse('Failed to fetch category', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = categorySchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const category = await prisma.category.update({
            where: { id },
            data: validation.data
        })

        return successResponse(category, 'Category updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Category not found', null, 404)
        return errorResponse('Failed to update category', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.category.delete({ where: { id } })
        return successResponse(null, 'Category deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Category not found', null, 404)
        return errorResponse('Failed to delete category', error.message, 500)
    }
}
