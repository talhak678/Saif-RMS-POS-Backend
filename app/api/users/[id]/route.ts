import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth-utils'
import { userUpdateSchema } from '@/lib/validations/user'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const user = await prisma.user.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            },
            include: {
                role: {
                    include: { permissions: true }
                },
                restaurant: true
            },
        })

        if (!user) return errorResponse('User not found', null, 404)

        const { password, ...sanitizedUser } = user
        return successResponse(sanitizedUser)
    } catch (error: any) {
        return errorResponse('Failed to fetch user', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.user.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('User not found or unauthorized', null, 404)

        const body = await req.json()
        const validation = userUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, roleId, restaurantId: bodyRestId } = validation.data
        const data: any = { name, email, roleId }

        if (auth.role === 'SUPER_ADMIN') {
            data.restaurantId = bodyRestId;
        } else {
            data.restaurantId = restaurantId;
        }

        if (password) {
            data.password = await hashPassword(password)
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            include: {
                role: true,
                restaurant: true
            }
        })

        const { password: _, ...sanitizedUser } = user
        return successResponse(sanitizedUser, 'User updated successfully')
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Email already exists')
        return errorResponse('Failed to update user', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN'] })

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.user.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('User not found or unauthorized', null, 404)

        await prisma.user.delete({ where: { id } })
        return successResponse(null, 'User deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete user', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN'] })
