import { z } from 'zod'

export const customerSchema = z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters'),
    email: z.string().email('Invalid email address').optional().nullable(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional().nullable(),
    loyaltyPoints: z.number().int().nonnegative().optional(),
})
