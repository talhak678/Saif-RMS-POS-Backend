import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ingredientSchema } from '@/lib/validations/inventory'
import { withAuth } from '@/lib/with-auth'
import { z } from 'zod'

const bulkIngredientSchema = z.array(ingredientSchema)

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        if (!Array.isArray(body)) {
            return errorResponse('Expected an array of ingredients', null, 400)
        }

        // Inject restaurantId for all items if not present or if not super admin
        const processedItems = body.map(item => ({
            ...item,
            restaurantId: (auth.role !== 'SUPER_ADMIN' || !item.restaurantId)
                ? auth.restaurantId
                : item.restaurantId,
            unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
            parLevel: item.parLevel ? Number(item.parLevel) : undefined
        }))

        const validation = bulkIngredientSchema.safeParse(processedItems)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const ingredients = await prisma.ingredient.createMany({
            data: validation.data,
            skipDuplicates: true // Optional: skip items that might fail unique constraints if any
        })

        return successResponse(ingredients, `${ingredients.count} Ingredients created successfully`, 201)
    } catch (error: any) {
        return errorResponse('Failed to bulk create ingredients', error.message, 500)
    }
}, { roles: ['SUPER_ADMIN', 'ADMIN', 'Manager'] })
