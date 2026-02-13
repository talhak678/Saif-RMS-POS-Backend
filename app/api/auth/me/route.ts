import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { getAuthContext } from '@/lib/auth'

export async function GET() {
    try {
        const payload = await getAuthContext()

        if (!payload) {
            return errorResponse('Not authenticated', null, 401)
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            include: {
                role: { include: { permissions: true } },
                restaurant: true
            }
        })

        if (!user) {
            return errorResponse('User not found', null, 404)
        }

        const { password, ...sanitizedUser } = user
        return successResponse(sanitizedUser)
    } catch (error: any) {
        return errorResponse('Failed to fetch user', error.message, 500)
    }
}
