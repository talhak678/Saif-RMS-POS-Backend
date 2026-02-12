import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { cmsPageSchema } from '@/lib/validations/cms'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const page = await prisma.cmsPage.findUnique({
            where: { id },
            include: { restaurant: true }
        })
        if (!page) return errorResponse('Page not found', null, 404)
        return successResponse(page)
    } catch (error: any) {
        return errorResponse('Failed to fetch page', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = cmsPageSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const page = await prisma.cmsPage.update({
            where: { id },
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(page, 'Page updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Page not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Slug already exists for this restaurant')
        return errorResponse('Failed to update page', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.cmsPage.delete({ where: { id } })
        return successResponse(null, 'Page deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Page not found', null, 404)
        return errorResponse('Failed to delete page', error.message, 500)
    }
}
