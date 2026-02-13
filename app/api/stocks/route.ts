import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { stockSchema } from '@/lib/validations/inventory'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const stocks = await prisma.stock.findMany({
            where: {
                AND: [
                    branchId ? { branchId } : {},
                    restaurantId ? { branch: { restaurantId } } : {}
                ]
            },
            include: { branch: true, ingredient: true },
        })
        return successResponse(stocks)
    } catch (error: any) {
        return errorResponse('Failed to fetch stocks', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = stockSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { branchId, ingredientId, quantity } = validation.data

        // Security check: Verify branch belongs to restaurant
        if (auth.role !== 'Super Admin' && auth.restaurantId) {
            const branch = await prisma.branch.findUnique({
                where: { id: branchId },
                select: { restaurantId: true }
            })
            if (!branch || branch.restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized branch for this stock update', null, 403)
            }
        }

        const stock = await prisma.stock.upsert({
            where: { branchId_ingredientId: { branchId, ingredientId } },
            update: { quantity },
            create: { branchId, ingredientId, quantity },
        })
        return successResponse(stock, 'Stock updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update stock', error.message, 500)
    }
})
