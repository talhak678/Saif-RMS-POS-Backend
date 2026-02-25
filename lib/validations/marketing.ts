import { z } from 'zod'

export const discountCodeSchema = z.object({
    code: z.string().min(3, 'Code must be at least 3 characters'),
    percentage: z.number().min(0).max(100).optional(),
    amount: z.number().min(0).optional(),
    isActive: z.boolean().default(true),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
    expiresAt: z.string().optional().transform((val) => (val ? new Date(val) : undefined)),
}).refine(data => data.percentage !== undefined || data.amount !== undefined, {
    message: "Either percentage or amount must be provided",
})

export const reviewSchema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().optional(),
    reply: z.string().optional(),
    orderId: z.string().cuid('Invalid order ID'),
    menuItemId: z.string().cuid('Invalid menu item ID').optional(),
})

export const riderSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().optional(),
    status: z.enum(['AVAILABLE', 'BUSY', 'OFFLINE']).default('AVAILABLE'),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})
