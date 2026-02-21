import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getAuthContext } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    try {
        const payload = await getAuthContext(req)

        if (!payload) {
            return errorResponse('Not authenticated', null, 401)
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                role: { include: { permissions: true } },
                restaurant: true
            }
        })

        if (!user) {
            return errorResponse('User not found', null, 404)
        }

        const { password, ...sanitizedUser } = user
        return successResponse(sanitizedUser)
    } catch (error: any) {
        return errorResponse('Failed to fetch user', error.message, 500)
    }
}
export async function PUT(req: NextRequest) {
    try {
        const payload = await getAuthContext(req)

        if (!payload) {
            return errorResponse('Not authenticated', null, 401)
        }

        const body = await req.json()
        const { name, logo } = body

        // Update User Name
        if (name) {
            await prisma.user.update({
                where: { id: payload.userId },
                data: { name }
            })
        }

        // Update Restaurant Logo if provided
        if (logo && payload.restaurantId) {
            await prisma.restaurant.update({
                where: { id: payload.restaurantId },
                data: { logo }
            })
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                role: { include: { permissions: true } },
                restaurant: true
            }
        })

        const { password, ...sanitizedUser } = user as any
        return successResponse(sanitizedUser, 'Profile updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update profile', error.message, 500)
    }
}
