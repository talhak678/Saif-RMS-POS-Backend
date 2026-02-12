import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { promoBannerSchema } from '@/lib/validations/cms'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const banner = await prisma.promoBanner.findUnique({
            where: { id },
            include: { restaurant: true }
        })
        if (!banner) return errorResponse('Banner not found', null, 404)
        return successResponse(banner)
    } catch (error: any) {
        return errorResponse('Failed to fetch banner', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = promoBannerSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const banner = await prisma.promoBanner.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(banner, 'Banner updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Banner not found', null, 404)
        return errorResponse('Failed to update banner', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.promoBanner.delete({ where: { id } })
        return successResponse(null, 'Banner deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Banner not found', null, 404)
        return errorResponse('Failed to delete banner', error.message, 500)
    }
}
