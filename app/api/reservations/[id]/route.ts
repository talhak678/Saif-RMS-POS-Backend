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
            include: { branch: true }
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
        const reservation = await prisma.reservation.update({
            where: { id },
            data: validation.data,
            include: { branch: true }
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
        await prisma.reservation.delete({ where: { id } })
        return successResponse(null, 'Reservation deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Reservation not found', null, 404)
        return errorResponse('Failed to delete reservation', error.message, 500)
    }
}
