import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const status = searchParams.get('status')
        const tableId = searchParams.get('tableId')

        let restaurantId = auth.restaurantId
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId
            else restaurantId = undefined
        }

        const reservations = await prisma.reservation.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    status ? { status: status as any } : {},
                    tableId ? { tableId } : {},
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: {
                branch: { select: { id: true, name: true } },
                table: { select: { id: true, number: true, capacity: true, status: true } }
            },
            orderBy: { startTime: 'asc' },
        })
        return successResponse(reservations)
    } catch (error: any) {
        return errorResponse('Failed to fetch reservations', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = reservationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { tableId, branchId } = validation.data

        // Security check: Verify branch belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch for this reservation', null, 403)
            }
        }

        // If tableId provided, verify table exists and is AVAILABLE
        if (tableId) {
            const table = await prisma.table.findUnique({ where: { id: tableId } })
            if (!table) return errorResponse('Table not found', null, 404)
            if (table.status !== 'AVAILABLE') {
                return errorResponse(`Table is currently ${table.status}`, null, 409)
            }
        }

        // Create reservation + update table status in transaction
        const reservation = await prisma.$transaction(async (tx) => {
            const created = await tx.reservation.create({
                data: validation.data,
                include: {
                    branch: { select: { id: true, name: true } },
                    table: { select: { id: true, number: true, capacity: true, status: true } }
                }
            })

            // Auto-set table status to RESERVED
            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'RESERVED' }
                })
            }

            return created
        })

        return successResponse(reservation, 'Reservation booked successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to book reservation', error.message, 500)
    }
})
