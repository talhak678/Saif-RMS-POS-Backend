import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { restaurantSchema } from '@/lib/validations/restaurant'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            include: {
                branches: true,
                settings: true,
                categories: true
            }
        })

        if (!restaurant) return errorResponse('Restaurant not found', null, 404)
        return successResponse(restaurant)
    } catch (error: any) {
        return errorResponse('Failed to fetch restaurant', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = restaurantSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const restaurant = await prisma.restaurant.update({
            where: { id },
            data: validation.data
        })

        return successResponse(restaurant, 'Restaurant updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Restaurant not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Restaurant slug already exists')
        return errorResponse('Failed to update restaurant', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.restaurant.delete({ where: { id } })
        return successResponse(null, 'Restaurant deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Restaurant not found', null, 404)
        return errorResponse('Failed to delete restaurant', error.message, 500)
    }
}
