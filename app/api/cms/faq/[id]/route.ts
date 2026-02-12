import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { faqSchema } from '@/lib/validations/cms'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const faqItem = await prisma.faqItem.findUnique({
            where: { id },
            include: { restaurant: true }
        })
        if (!faqItem) return errorResponse('FAQ not found', null, 404)
        return successResponse(faqItem)
    } catch (error: any) {
        return errorResponse('Failed to fetch FAQ', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = faqSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const faqItem = await prisma.faqItem.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(faqItem, 'FAQ updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('FAQ not found', null, 404)
        return errorResponse('Failed to update FAQ', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.faqItem.delete({ where: { id } })
        return successResponse(null, 'FAQ deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('FAQ not found', null, 404)
        return errorResponse('Failed to delete FAQ', error.message, 500)
    }
}
