import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { menuItemSchema } from '@/lib/validations/menu-item'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const menuItem = await prisma.menuItem.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            },
            include: { category: true, variations: true, addons: true, reviews: true }
        })

        if (!menuItem) return errorResponse('Menu item not found', null, 404)
        return successResponse(menuItem)
    } catch (error: any) {
        return errorResponse('Failed to fetch menu item', error.message, 500)
    }
})

export const PUT = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        // Ownership check
        const existing = await prisma.menuItem.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Menu item not found or unauthorized', null, 404)

        const body = await req.json()
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = restaurantId;
        }

        const validation = menuItemSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { variations, addons, ...rest } = validation.data

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
        return errorResponse('Failed to update menu item', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })

export const DELETE = withAuth(async (req, { params, auth }) => {
    try {
        const { id } = await params
        const restaurantId = auth.restaurantId;

        const existing = await prisma.menuItem.findFirst({
            where: {
                id,
                ...(auth.role !== 'Super Admin' && restaurantId ? { restaurantId } : {})
            }
        })
        if (!existing) return errorResponse('Menu item not found or unauthorized', null, 404)

        await prisma.menuItem.delete({ where: { id } })
        return successResponse(null, 'Menu item deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete menu item', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })
