import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const reservations = await prisma.reservation.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: { branch: true },
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

        // Security check: Verify branch belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: validation.data.branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch for this reservation', null, 403)
            }
        }

        const reservation = await prisma.reservation.create({
            data: validation.data,
            include: { branch: true }
        })
        return successResponse(reservation, 'Reservation booked successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to book reservation', error.message, 500)
    }
})
