import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const reservation = await prisma.reservation.findUnique({
            where: { id },
            include: {
                branch: true,
                table: { select: { id: true, number: true, capacity: true, status: true } }
            }
        })
        if (!reservation) return errorResponse('Reservation not found', null, 404)
        return successResponse(reservation)
    } catch (error: any) {
        return errorResponse('Failed to fetch reservation', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = reservationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const existing = await prisma.reservation.findUnique({ where: { id } })
        if (!existing) return errorResponse('Reservation not found', null, 404)

        const newStatus = validation.data.status
        const newTableId = validation.data.tableId
        const oldTableId = existing.tableId

        const reservation = await prisma.$transaction(async (tx) => {
            const updated = await tx.reservation.update({
                where: { id },
                data: validation.data,
                include: {
                    branch: true,
                    table: { select: { id: true, number: true, capacity: true, status: true } }
                }
            })

            // If reservation is cancelled or completed, free the table
            if (newStatus === 'CANCELLED' || newStatus === 'COMPLETED') {
                const tableToFree = newTableId || oldTableId
                if (tableToFree) {
                    await tx.table.update({
                        where: { id: tableToFree },
                        data: { status: 'AVAILABLE' }
                    })
                }
            }

            // If table changed to a new one, reserve new and free old
            if (newTableId && newTableId !== oldTableId) {
                await tx.table.update({
                    where: { id: newTableId },
                    data: { status: 'RESERVED' }
                })
                if (oldTableId) {
                    await tx.table.update({
                        where: { id: oldTableId },
                        data: { status: 'AVAILABLE' }
                    })
                }
            }

            return updated
        })

        return successResponse(reservation, 'Reservation updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Reservation not found', null, 404)
        return errorResponse('Failed to update reservation', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const existing = await prisma.reservation.findUnique({ where: { id } })
        if (!existing) return errorResponse('Reservation not found', null, 404)

        await prisma.$transaction(async (tx) => {
            await tx.reservation.delete({ where: { id } })

            // Free up the table when reservation is deleted
            if (existing.tableId) {
                await tx.table.update({
                    where: { id: existing.tableId },
                    data: { status: 'AVAILABLE' }
                })
            }
        })

        return successResponse(null, 'Reservation deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Reservation not found', null, 404)
        return errorResponse('Failed to delete reservation', error.message, 500)
    }
}
