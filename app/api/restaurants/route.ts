import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { restaurantSchema } from '@/lib/validations/restaurant'

export async function GET() {
    try {
        const restaurants = await prisma.restaurant.findMany({
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
}

export async function POST(req: NextRequest) {
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
}
