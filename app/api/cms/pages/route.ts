import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { cmsPageSchema } from '@/lib/validations/cms'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')
        const pages = await prisma.cmsPage.findMany({
            where: restaurantId ? { restaurantId } : {},
            include: { restaurant: true }
        })
        return successResponse(pages)
    } catch (error: any) {
        return errorResponse('Failed to fetch pages', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const validation = cmsPageSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }
        const page = await prisma.cmsPage.create({
            data: validation.data,
            include: { restaurant: true }
        })
        return successResponse(page, 'Page created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') return errorResponse('Slug already exists for this restaurant')
        return errorResponse('Failed to create page', error.message, 500)
    }
}
