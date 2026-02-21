import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { branchSchema } from '@/lib/validations/branch'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const branch = await prisma.branch.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            },
            include: { restaurant: true }
        })

        if (!branch) return errorResponse('Branch not found', null, 404)
        return successResponse(branch)
    } catch (error: any) {
        return errorResponse('Failed to fetch branch', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;
        const body = await req.json()

        // Ownership check
        const existing = await prisma.branch.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })

        if (!existing) return errorResponse('Branch not found or unauthorized', null, 404)

        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = restaurantId;
        }

        const validation = branchSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const branch = await prisma.branch.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })

        return successResponse(branch, 'Branch updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update branch', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN'] })

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.branch.findFirst({
            where: {
                id,
                ...(auth.role !== 'SUPER_ADMIN' && restaurantId ? { restaurantId } : {})
            }
        })

        if (!existing) return errorResponse('Branch not found or unauthorized', null, 404)

        await prisma.branch.delete({ where: { id } })
        return successResponse(null, 'Branch deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete branch', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN'] })
