import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        await prisma.user.update({
            where: { id: auth.userId },
            data: { pushToken: null }
        })

        return successResponse(null, 'Push token deleted successfully')
    } catch (error: any) {
        return errorResponse('Failed to delete push token', error.message, 500)
    }
})
