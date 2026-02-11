import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { roleSchema } from '@/lib/validations/role'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const role = await prisma.role.findUnique({
            where: { id },
            include: { permissions: true },
        })

        if (!role) return errorResponse('Role not found', null, 404)
        return successResponse(role)
    } catch (error: any) {
        return errorResponse('Failed to fetch role', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = roleSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { name, permissionIds } = validation.data

        const role = await prisma.role.update({
            where: { id },
            data: {
                name,
                permissions: {
                    set: permissionIds?.map((pid: string) => ({ id: pid })) || [],
                },
            },
            include: { permissions: true },
        })

        return successResponse(role, 'Role updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Role not found', null, 404)
        return errorResponse('Failed to update role', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const userCount = await prisma.user.count({ where: { roleId: id } })

        if (userCount > 0) {
            return errorResponse('Cannot delete role as it is assigned to users', null, 400)
        }

        await prisma.role.delete({ where: { id } })
        return successResponse(null, 'Role deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Role not found', null, 404)
        return errorResponse('Failed to delete role', error.message, 500)
    }
}
