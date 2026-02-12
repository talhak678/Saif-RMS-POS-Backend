import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const reservations = await prisma.reservation.findMany({
            where: branchId ? { branchId } : {},
            include: { branch: true },
            orderBy: { startTime: 'asc' },
        })
        return successResponse(reservations)
    } catch (error: any) {
        return errorResponse('Failed to fetch reservations', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = reservationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const reservation = await prisma.reservation.create({
            data: validation.data,
            include: { branch: true }
        })
        return successResponse(reservation, 'Reservation booked successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to book reservation', error.message, 500)
    }
}
