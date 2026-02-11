import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            include: { restaurant: true }
        })
        return successResponse(branches)
    } catch (error: any) {
        return errorResponse('Failed to fetch branches', error.message, 500)
    }
}
