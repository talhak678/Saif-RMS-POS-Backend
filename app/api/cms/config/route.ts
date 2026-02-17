import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { websiteConfigSchema } from '@/lib/validations/cms'
import { withAuth } from '@/lib/with-auth'

// GET configuration for authenticated user's restaurant
export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        // If Super Admin, allow fetching any restaurant's config via query param
        if (auth.role === 'Super Admin') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
        }

        if (!restaurantId) return errorResponse('Restaurant ID is required', null, 400)

        const config = await prisma.websiteConfig.findUnique({
            where: { restaurantId },
        })

        if (!config) {
            // Return a default structure if not found
            return successResponse({
                restaurantId,
                backgroundColor: '#ffffff',
                primaryColor: '#ff0000',
                configJson: {} // Frontend handles default UI sections
            })
        }

        return successResponse(config)
    } catch (error: any) {
        return errorResponse('Failed to fetch website configuration', error.message, 500)
    }
})

// UPSERT configuration
export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()

        // Ensure user only updates their own restaurant's config unless Super Admin
        if (auth.role !== 'Super Admin' || !body.restaurantId) {
            body.restaurantId = auth.restaurantId;
        }

        if (!body.restaurantId) return errorResponse('Restaurant ID is required', null, 400)

        const validation = websiteConfigSchema.safeParse(body)
        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const config = await prisma.websiteConfig.upsert({
            where: { restaurantId: body.restaurantId },
            update: {
                backgroundColor: validation.data.backgroundColor,
                primaryColor: validation.data.primaryColor,
                configJson: validation.data.configJson,
            },
            create: {
                restaurantId: body.restaurantId,
                backgroundColor: validation.data.backgroundColor,
                primaryColor: validation.data.primaryColor,
                configJson: validation.data.configJson,
            }
        })

        return successResponse(config, 'Configuration updated successfully')
    } catch (error: any) {
        return errorResponse('Failed to update configuration', error.message, 500)
    }
}, { roles: ['Super Admin', 'Admin'] })
