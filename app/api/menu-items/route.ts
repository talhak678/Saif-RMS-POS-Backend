import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { menuItemSchema } from '@/lib/validations/menu-item'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const categoryId = searchParams.get('categoryId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const menuItems = await prisma.menuItem.findMany({
            where: {
                AND: [
                    categoryId ? { categoryId } : {},
                    restaurantId ? { restaurantId } : {}
                ]
            },
            include: { category: true, variations: true, addons: true }
        })
        return successResponse(menuItems)
    } catch (error: any) {
        return errorResponse('Failed to fetch menu items', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'SUPER_ADMIN' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = menuItemSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { variations, addons, ...rest } = validation.data

        const menuItem = await prisma.menuItem.create({
            data: {
                ...rest,
                variations: {
                    create: variations
                },
                addons: {
                    create: addons
                }
            },
            include: { variations: true, addons: true }
        })

        return successResponse(menuItem, 'Menu item created successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to create menu item', error.message, 500)
    }
})
