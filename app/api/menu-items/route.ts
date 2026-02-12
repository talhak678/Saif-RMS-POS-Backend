import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { menuItemSchema } from '@/lib/validations/menu-item'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const categoryId = searchParams.get('categoryId')

        const menuItems = await prisma.menuItem.findMany({
            where: categoryId ? { categoryId } : {},
            include: { category: true, variations: true, addons: true }
        })
        return successResponse(menuItems)
    } catch (error: any) {
        return errorResponse('Failed to fetch menu items', error.message, 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
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
}
