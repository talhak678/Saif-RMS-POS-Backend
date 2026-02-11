import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { permissionSchema } from '@/lib/validations/role'

export async function GET() {
    try {
        const permissions = await prisma.permission.findMany({
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(permissions)
    } catch (error: any) {
        return errorResponse('Failed to fetch permissions', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = permissionSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { action } = validation.data

        const permission = await prisma.permission.create({
            data: { action },
        })

        return successResponse(permission, 'Permission created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Permission action already exists')
        return errorResponse('Failed to create permission', error.message, 500)
    }
}
