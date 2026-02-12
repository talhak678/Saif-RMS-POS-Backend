import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { menuItemSchema } from '@/lib/validations/menu-item'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const menuItem = await prisma.menuItem.findUnique({
            where: { id },
            include: { category: true, variations: true, addons: true, reviews: true }
        })

        if (!menuItem) return errorResponse('Menu item not found', null, 404)
        return successResponse(menuItem)
    } catch (error: any) {
        return errorResponse('Failed to fetch menu item', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()
        const validation = menuItemSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { variations, addons, ...rest } = validation.data

        // Clear existing variations and addons before updating
        await prisma.$transaction([
            prisma.variation.deleteMany({ where: { menuItemId: id } }),
            prisma.addon.deleteMany({ where: { menuItemId: id } }),
            prisma.menuItem.update({
                where: { id },
                data: {
                    ...rest,
                    variations: { create: variations },
                    addons: { create: addons }
                }
            })
        ])

        const updatedItem = await prisma.menuItem.findUnique({
            where: { id },
            include: { variations: true, addons: true }
        })

        return successResponse(updatedItem, 'Menu item updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Menu item not found', null, 404)
        return errorResponse('Failed to update menu item', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.menuItem.delete({ where: { id } })
        return successResponse(null, 'Menu item deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Menu item not found', null, 404)
        return errorResponse('Failed to delete menu item', error.message, 500)
    }
}
