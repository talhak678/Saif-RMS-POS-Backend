import { z } from 'zod'

export const branchSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    phone: z.string().optional(),
    whatsappNumber: z.string().optional(),
    isOpen: z.boolean().optional().default(true),
    timing: z.string().optional(),
    deliveryRadius: z.number().optional(),
    freeDeliveryThreshold: z.number().optional(),
    deliveryCharge: z.number().optional(),
    deliveryOffTime: z.string().optional(),
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})
