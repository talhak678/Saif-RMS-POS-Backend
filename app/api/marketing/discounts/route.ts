import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { discountCodeSchema } from '@/lib/validations/marketing'

export async function GET() {
    try {
        const discounts = await prisma.discountCode.findMany({
            orderBy: { createdAt: 'desc' },
        })
        return successResponse(discounts)
    } catch (error: any) {
        return errorResponse('Failed to fetch discount codes', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = discountCodeSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const discount = await prisma.discountCode.create({
            data: validation.data
        })

        return successResponse(discount, 'Discount code created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Discount code already exists')
        return errorResponse('Failed to create discount code', error.message, 500)
    }
}
