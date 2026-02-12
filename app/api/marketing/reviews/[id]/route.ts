import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { reviewSchema } from '@/lib/validations/marketing'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const review = await prisma.review.findUnique({
            where: { id },
            include: {
                order: { include: { customer: true } },
                menuItem: true
            }
        })
        if (!review) return errorResponse('Review not found', null, 404)
        return successResponse(review)
    } catch (error: any) {
        return errorResponse('Failed to fetch review', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = reviewSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const review = await prisma.review.update({
            where: { id },
            data: validation.data,
            include: { order: true, menuItem: true }
        })
        return successResponse(review, 'Review updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Review not found', null, 404)
        return errorResponse('Failed to update review', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.review.delete({ where: { id } })
        return successResponse(null, 'Review deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Review not found', null, 404)
        return errorResponse('Failed to delete review', error.message, 500)
    }
}
