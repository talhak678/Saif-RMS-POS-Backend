import { z } from 'zod'

export const menuItemSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    price: z.number().min(0, 'Price must be positive'),
    image: z.string().url().optional().or(z.literal('')),
    isAvailable: z.boolean().default(true),
    categoryId: z.string().cuid('Invalid category ID'),
    variations: z.array(z.object({
        name: z.string(),
        price: z.number().min(0)
    })).optional(),
    addons: z.array(z.object({
        name: z.string(),
        price: z.number().min(0)
    })).optional(),
})
