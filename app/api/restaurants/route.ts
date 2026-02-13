import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { restaurantSchema } from '@/lib/validations/restaurant'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        // Only Super Admin can see all restaurants
        // Regular Admin sees only their own
        const restaurantId = auth.role === 'Super Admin' ? undefined : auth.restaurantId;

        const restaurants = await prisma.restaurant.findMany({
            where: restaurantId ? { id: restaurantId } : {},
            include: {
                _count: {
                    select: { branches: true, users: true }
                }
            }
        })
        return successResponse(restaurants)
    } catch (error: any) {
        return errorResponse('Failed to fetch restaurants', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = restaurantSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const restaurant = await prisma.restaurant.create({
            data: validation.data
        })

        return successResponse(restaurant, 'Restaurant created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Restaurant slug already exists')
        return errorResponse('Failed to create restaurant', error.message, 500)
    }
}, { roles: ['Super Admin'] }) // Only super admins can create new restaurants
