import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { tableUpdateSchema } from '@/lib/validations/table'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId

        const table = await prisma.table.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { branch: { restaurantId } } : {})
            },
            include: {
                branch: { select: { id: true, name: true } },
                reservations: {
                    where: { status: { in: ['BOOKED', 'ARRIVED'] } },
                    select: {
                        id: true,
                        customerName: true,
                        guestCount: true,
                        startTime: true,
                        status: true
                    },
                    orderBy: { startTime: 'asc' }
                }
            }
        })

        if (!table) return errorResponse('Table not found', null, 404)
        return successResponse(table)
    } catch (error: any) {
        return errorResponse('Failed to fetch table', error.message, 500)
    }
})

export const PUT = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId

        const existing = await prisma.table.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { branch: { restaurantId } } : {})
            }
        })
        if (!existing) return errorResponse('Table not found or unauthorized', null, 404)

        const body = await req.json()
        const validation = tableUpdateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const table = await prisma.table.update({
            where: { id },
            data: { ...validation.data, status: validation.data.status as any },
            include: {
                branch: { select: { id: true, name: true } }
            }
        })

        return successResponse(table, 'Table updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Table not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Table number already exists in this branch', null, 409)
        return errorResponse('Failed to update table', error.message, 500)
    }
})

export const DELETE = withAuth(async (req: NextRequest, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId

        const existing = await prisma.table.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { branch: { restaurantId } } : {})
            }
        })
        if (!existing) return errorResponse('Table not found or unauthorized', null, 404)

        await prisma.table.delete({ where: { id } })
        return successResponse(null, 'Table deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Table not found', null, 404)
        return errorResponse('Failed to delete table', error.message, 500)
    }
})
