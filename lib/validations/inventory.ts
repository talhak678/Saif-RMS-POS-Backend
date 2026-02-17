import { z } from 'zod'

export const ingredientSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    unit: z.string().min(1, 'Unit is required'), // e.g., kg, grams, pcs
    restaurantId: z.string().cuid('Invalid restaurant ID'),
})

export const recipeSchema = z.object({
    menuItemId: z.string().cuid('Invalid menu item ID'),
    ingredientId: z.string().cuid('Invalid ingredient ID'),
    quantity: z.number().positive('Quantity must be positive'),
})

export const stockSchema = z.object({
    quantity: z.number().min(0, 'Quantity must be positive'),
    branchId: z.string().cuid('Invalid branch ID'),
    ingredientId: z.string().cuid('Invalid ingredient ID'),
})
