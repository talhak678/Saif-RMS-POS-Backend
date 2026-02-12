import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { stockSchema } from '@/lib/validations/inventory'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const stocks = await prisma.stock.findMany({
            where: branchId ? { branchId } : {},
            include: { branch: true, ingredient: true },
        })
        return successResponse(stocks)
    } catch (error: any) {
        return errorResponse('Failed to fetch stocks', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = stockSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const { branchId, ingredientId, quantity } = validation.data
        const stock = await prisma.stock.upsert({
            where: { branchId_ingredientId: { branchId, ingredientId } },
            update: { quantity },
            create: { branchId, ingredientId, quantity },
        })
        return successResponse(stock, 'Stock updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update stock', error.message, 500)
    }
}
