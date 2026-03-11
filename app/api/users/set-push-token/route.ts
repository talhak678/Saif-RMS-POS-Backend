import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const { pushToken } = body

        if (!pushToken) {
            return errorResponse('Push token is required', null, 400)
        }

        await prisma.user.update({
            where: { id: auth.userId },
            data: { pushToken }
        })

        return successResponse(null, 'Push token set successfully')
    } catch (error: any) {
        return errorResponse('Failed to set push token', error.message, 500)
    }
})
