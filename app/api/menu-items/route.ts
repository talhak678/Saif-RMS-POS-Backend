import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
    try {
        const menuItems = await prisma.menuItem.findMany({
            include: { category: true }
        })
        return successResponse(menuItems)
    } catch (error: any) {
        return errorResponse('Failed to fetch menu items', error.message, 500)
    }
}
