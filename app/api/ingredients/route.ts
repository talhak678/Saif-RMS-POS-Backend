import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { ingredientSchema } from '@/lib/validations/inventory'

export async function GET() {
    try {
        const ingredients = await prisma.ingredient.findMany({
            include: {
                _count: { select: { stocks: true, recipes: true } }
            }
        })
        return successResponse(ingredients)
    } catch (error: any) {
        return errorResponse('Failed to fetch ingredients', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = ingredientSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const ingredient = await prisma.ingredient.create({
            data: validation.data
        })

        return successResponse(ingredient, 'Ingredient created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create ingredient', error.message, 500)
    }
}
