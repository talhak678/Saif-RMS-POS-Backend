import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { riderSchema } from '@/lib/validations/marketing'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const rider = await prisma.rider.findUnique({ where: { id } })
        if (!rider) return errorResponse('Rider not found', null, 404)
        return successResponse(rider)
    } catch (error: any) {
        return errorResponse('Failed to fetch rider', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = riderSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const rider = await prisma.rider.update({
            where: { id },
            data: validation.data
        })
        return successResponse(rider, 'Rider updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Rider not found', null, 404)
        return errorResponse('Failed to update rider', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.rider.delete({ where: { id } })
        return successResponse(null, 'Rider deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Rider not found', null, 404)
        return errorResponse('Failed to delete rider', error.message, 500)
    }
}
