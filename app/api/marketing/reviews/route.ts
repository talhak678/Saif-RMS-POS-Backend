import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reviewSchema } from '@/lib/validations/marketing'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const orderId = searchParams.get('orderId')
        const menuItemId = searchParams.get('menuItemId')

        const reviews = await prisma.review.findMany({
            where: {
                ...(orderId && { orderId }),
                ...(menuItemId && { menuItemId }),
            },
            include: {
                order: { include: { customer: true } },
                menuItem: true
            },
            orderBy: { createdAt: 'desc' }
        })
        return successResponse(reviews)
    } catch (error: any) {
        return errorResponse('Failed to fetch reviews', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = reviewSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const review = await prisma.review.create({
            data: validation.data,
            include: { order: true, menuItem: true }
        })
        return successResponse(review, 'Review created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Review for this order already exists')
        return errorResponse('Failed to create review', error.message, 500)
    }
}
