import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/with-auth'

const settingSchema = z.object({
    key: z.string().min(1, 'Key is required'),
    value: z.string().min(1, 'Value is required'),
    restaurantId: z.string().cuid('Invalid restaurant ID').optional(),
})

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        const settings = await prisma.setting.findMany({
            where: restaurantId ? { restaurantId } : {},
        })
        return successResponse(settings)
    } catch (error: any) {
        return errorResponse('Failed to fetch settings', error.message, 500)
    }
})

export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Inject restaurantId
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        const validation = settingSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const setting = await prisma.setting.upsert({
            where: {
                restaurantId_key: {
                    restaurantId: validation.data.restaurantId as string,
                    key: validation.data.key
                }
            },
            update: { value: validation.data.value },
            create: {
                key: validation.data.key,
                value: validation.data.value,
                restaurantId: validation.data.restaurantId as string
            }
        })

        return successResponse(setting, 'Setting saved successfully')
    } catch (error: any) {
        return errorResponse('Failed to save setting', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })
