import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { tableCreateSchema } from '@/lib/validations/table'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const status = searchParams.get('status') as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | null

        let restaurantId = auth.restaurantId
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId
            else restaurantId = undefined
        }

        const tables = await prisma.table.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    status ? { status } : {},
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: {
                branch: { select: { id: true, name: true } },
                _count: { select: { reservations: true } }
            },
            orderBy: [{ branchId: 'asc' }, { number: 'asc' }]
        })

        return successResponse(tables)
    } catch (error: any) {
        return errorResponse('Failed to fetch tables', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = tableCreateSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { branchId, number, capacity, status } = validation.data

        // Security: verify branch belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch', null, 403)
            }
        }

        const table = await prisma.table.create({
            data: { number, capacity, branchId, status: status as any },
            include: { branch: { select: { id: true, name: true } } }
        })

        return successResponse(table, 'Table created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return errorResponse('Table number already exists in this branch', null, 409)
        }
        return errorResponse('Failed to create table', error.message, 500)
    }
})
