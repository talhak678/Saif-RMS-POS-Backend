import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { roleSchema } from '@/lib/validations/role'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const roles = await prisma.role.findMany({
            where: auth.role !== 'Super Admin' ? {
                NOT: {
                    name: 'Super Admin'
                }
            } : {},
            include: {
                permissions: true,
                _count: { select: { users: true } },
            },
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(roles)
    } catch (error: any) {
        return errorResponse('Failed to fetch roles', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = roleSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, permissionIds } = validation.data

        const role = await prisma.role.create({
            data: {
                name,
                permissions: {
                    connect: permissionIds?.map((id: string) => ({ id })) || [],
                },
            },
            include: { permissions: true },
        })

        return successResponse(role, 'Role created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Role name already exists')
        return errorResponse('Failed to create role', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin', 'Manager'] }) // Super Admin and Admin can manage roles
