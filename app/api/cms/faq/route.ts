import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { faqSchema } from '@/lib/validations/cms'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')
        const faqItems = await prisma.faqItem.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: { restaurant: true }
        })
        return successResponse(faqItems)
    } catch (error: any) {
        return errorResponse('Failed to fetch FAQs', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = faqSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const faqItem = await prisma.faqItem.create({
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(faqItem, 'FAQ created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create FAQ', error.message, 500)
    }
}
