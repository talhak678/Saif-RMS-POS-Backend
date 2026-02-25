import { z } from 'zod'

export const subscriptionPriceSchema = z.object({
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']),
    price: z.number().nonnegative('Price must be a non-negative number'),
    billingCycle: z.string().min(1, 'Billing cycle is required').default('MONTHLY'),
    isActive: z.boolean().optional().default(true),
    features: z.array(z.string()).optional().default([]),
    restaurantId: z.string().min(1, 'Restaurant ID is required'),
})

export const subscriptionPriceUpdateSchema = z.object({
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
    price: z.number().nonnegative('Price must be a non-negative number').optional(),
    billingCycle: z.string().optional(),
    isActive: z.boolean().optional(),
    features: z.array(z.string()).optional(),
})
