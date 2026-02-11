import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth-utils'
import { userUpdateSchema } from '@/lib/validations/user'

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const user = await prisma.user.findUnique({
            where: { id },
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
}

export async function PUT(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = userUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, roleId, restaurantId } = validation.data
        const data: any = { name, email, roleId, restaurantId }

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
        if (error.code === 'P2025') return errorResponse('User not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Email already exists')
        return errorResponse('Failed to update user', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params
        await prisma.user.delete({ where: { id } })
        return successResponse(null, 'User deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('User not found', null, 404)
        return errorResponse('Failed to delete user', error.message, 500)
    }
}
