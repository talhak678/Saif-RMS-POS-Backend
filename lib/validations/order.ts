import { z } from 'zod'
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus, RiderStatus } from '@prisma/client'
import { riderSchema } from './marketing'

export const orderItemSchema = z.object({
    menuItemId: z.string().min(1, 'Menu item ID is required'),
    quantity: z.number().int().positive('Quantity must be at least 1'),
    price: z.number().positive('Price must be positive'),
})

export const orderCreateSchema = z.object({
    branchId: z.string().min(1, 'Branch ID is required'),
    customerId: z.string().optional().nullable(),
    type: z.nativeEnum(OrderType),
    source: z.enum(['WEBSITE', 'POS', 'MOBILE']).optional().default('POS'),
    total: z.number().positive('Total must be positive'),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
})

export const orderUpdateSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    riderId: z.string().optional().nullable(),
})
