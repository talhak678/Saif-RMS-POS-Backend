import { z } from 'zod'

export const reservationSchema = z.object({
    customerName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().min(8, 'Phone number is too short'),
    guestCount: z.number().int().positive('Guest count must be at least 1'),
    startTime: z.string().transform((val) => new Date(val)),
    status: z.enum(['BOOKED', 'ARRIVED', 'CANCELLED', 'COMPLETED']).default('BOOKED'),
    branchId: z.string().cuid('Invalid branch ID'),
    tableId: z.string().cuid('Invalid table ID').optional().nullable(),
})

