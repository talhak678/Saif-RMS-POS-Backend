import { z } from 'zod'

export const roleSchema = z.object({
    name: z.string().min(2, 'Role name must be at least 2 characters'),
    permissionIds: z.array(z.string()).optional(),
})

export const permissionSchema = z.object({
    action: z.string().min(3, 'Action description must be at least 3 characters'),
})
