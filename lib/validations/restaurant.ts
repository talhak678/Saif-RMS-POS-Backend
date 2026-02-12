import { z } from 'zod'

export const restaurantSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    slug: z.string().min(2, 'Slug must be at least 2 characters'),
    logo: z.string().url().optional().or(z.literal('')),
    description: z.string().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING'),
    subscription: z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).default('FREE'),
    facebookUrl: z.string().url().optional().or(z.literal('')),
    instagramUrl: z.string().url().optional().or(z.literal('')),
    tiktokUrl: z.string().url().optional().or(z.literal('')),
    metaPixelId: z.string().optional(),
})
