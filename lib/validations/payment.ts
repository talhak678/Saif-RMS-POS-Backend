import { z } from 'zod'

export const paymentSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    method: z.enum(['STRIPE', 'PAYPAL', 'COD', 'CASH']),
    status: z.enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED']).default('PENDING'),
    transactionId: z.string().optional(),
    orderId: z.string().cuid('Invalid order ID'),
})
