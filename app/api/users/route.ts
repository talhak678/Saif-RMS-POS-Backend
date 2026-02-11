import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { hashPassword } from '@/lib/auth-utils'
import { userCreateSchema } from '@/lib/validations/user'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

        const users = await prisma.user.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: {
                role: {
                    include: {
                        permissions: true
                    }
                },
                restaurant: true
            },
            orderBy: { createdAt: 'desc' },
        })

        const sanitizedUsers = users.map(({ password, ...user }) => user)
        return successResponse(sanitizedUsers)
    } catch (error: any) {
        return errorResponse('Failed to fetch users', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = userCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, email, password, roleId, restaurantId } = validation.data
        const hashedPassword = await hashPassword(password)

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                roleId,
                restaurantId
            },
            include: {
                role: true,
                restaurant: true
            }
        })

        const { password: _, ...sanitizedUser } = user
        return successResponse(sanitizedUser, 'User created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Email already exists')
        return errorResponse('Failed to create user', error.message, 500)
    }
}
