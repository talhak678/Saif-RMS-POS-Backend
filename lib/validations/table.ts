import { z } from 'zod'

export const tableCreateSchema = z.object({
    number: z.number().int().positive('Table number must be positive'),
    capacity: z.number().int().positive('Capacity must be at least 1'),
    branchId: z.string().min(1, 'Branch ID is required'),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED']).optional().default('AVAILABLE'),
})

export const tableUpdateSchema = z.object({
    number: z.number().int().positive('Table number must be positive').optional(),
    capacity: z.number().int().positive('Capacity must be at least 1').optional(),
    status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED']).optional(),
})
