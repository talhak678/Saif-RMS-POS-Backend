import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { categorySchema } from '@/lib/validations/category'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

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
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
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
}
