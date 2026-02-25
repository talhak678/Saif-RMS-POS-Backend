import { z } from 'zod';

export const subscriptionRequestSchema = z.object({
    restaurantId: z.string().min(1, 'Restaurant ID is required'),
    plan: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']),
    billingCycle: z.enum(['MONTHLY', 'YEARLY']),
    description: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
});

export const subscriptionRequestUpdateSchema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});
