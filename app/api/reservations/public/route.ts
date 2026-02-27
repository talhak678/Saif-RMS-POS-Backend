import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reservationSchema } from '@/lib/validations/reservation'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Public API validation
        const validation = reservationSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { branchId, customerName, startTime } = validation.data

        // 1. Create the reservation
        const reservation = await prisma.reservation.create({
            data: validation.data,
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        restaurantId: true
                    }
                }
            }
        })

        // 2. Find Admin/Manager users for this restaurant to notify them
        // We notify all users with 'Admin' or 'Merchant Admin' roles in that restaurant
        const restaurantId = reservation.branch.restaurantId
        const admins = await prisma.user.findMany({
            where: {
                restaurantId,
                role: {
                    name: {
                        in: ['ADMIN', 'Merchant Admin', 'Manager']
                    }
                }
            },
            select: { id: true }
        })

        // 3. Create notifications for all found admins
        if (admins.length > 0) {
            const formattedTime = new Date(startTime).toLocaleString('en-PK', {
                dateStyle: 'medium',
                timeStyle: 'short'
            })

            const customerEmail = body.email || 'N/A';
            const customerMsg = body.message ? `\nMessage: ${body.message}` : '';

            await prisma.notification.createMany({
                data: admins.map(admin => ({
                    userId: admin.id,
                    message: `New Table Booking: ${customerName} (${customerEmail}) has reserved a table for ${formattedTime} at ${reservation.branch.name}.${customerMsg}`,
                    isRead: false
                }))
            })
        }

        return successResponse(reservation, 'Reservation booked successfully', 201)
    } catch (error: any) {
        console.error('Public Reservation Error:', error)
        return errorResponse('Failed to book reservation', error.message, 500)
    }
}
