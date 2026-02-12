import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { discountCodeSchema } from '@/lib/validations/marketing'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const discount = await prisma.discountCode.findUnique({ where: { id } })
        if (!discount) return errorResponse('Discount code not found', null, 404)
        return successResponse(discount)
    } catch (error: any) {
        return errorResponse('Failed to fetch discount code', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = discountCodeSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const discount = await prisma.discountCode.update({
            where: { id },
            data: validation.data
        })
        return successResponse(discount, 'Discount code updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Discount code not found', null, 404)
        return errorResponse('Failed to update discount code', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.discountCode.delete({ where: { id } })
        return successResponse(null, 'Discount code deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Discount code not found', null, 404)
        return errorResponse('Failed to delete discount code', error.message, 500)
    }
}
