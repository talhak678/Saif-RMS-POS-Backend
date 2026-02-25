import { z } from 'zod'

export const userCreateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    roleId: z.string().min(1, 'Role is required'),
    restaurantId: z.string().optional().nullable(),
})

export const userUpdateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional().nullable(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
    roleId: z.string().min(1, 'Role is required').optional(),
    restaurantId: z.string().optional().nullable(),
})
export const userLoginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
})

export const verifyOtpSchema = z.object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
})

export const resetPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
})
