import { z } from 'zod'

export const categorySchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    image: z.string().optional(),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})
