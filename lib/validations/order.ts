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
    total: z.number().positive('Total must be positive'),
    paymentMethod: z.nativeEnum(PaymentMethod).optional(),
    items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
    deliveryAddress: z.string().optional().nullable(),
    deliveryLat: z.number().optional().nullable(),
    deliveryLng: z.number().optional().nullable(),
    deliveryCharge: z.number().optional().nullable(),
})

export const orderUpdateSchema = z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    riderId: z.string().optional().nullable(),
})
