import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionRequestSchema, subscriptionRequestUpdateSchema } from '@/lib/validations/subscription-request'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

        // If not super admin, they can only see their own restaurant's requests
        if (auth.role !== 'SUPER_ADMIN' && auth.restaurantId) {
            if (restaurantId && restaurantId !== auth.restaurantId) {
                return errorResponse('Unauthorized to view other restaurant requests', null, 403)
            }
        }

        const effectiveRestaurantId = auth.role === 'SUPER_ADMIN' ? restaurantId : auth.restaurantId

        const requests = await prisma.subscriptionRequest.findMany({
            where: {
                ...(effectiveRestaurantId ? { restaurantId: effectiveRestaurantId } : {}),
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(requests)
    } catch (error: any) {
        return errorResponse('Failed to fetch subscription requests', error.message, 500)
    }
})

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json()
        const validation = subscriptionRequestSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const { restaurantId, plan, billingCycle, description, contactName, contactEmail, contactPhone } = validation.data

        const subscriptionRequest = await prisma.subscriptionRequest.create({
            data: {
                restaurantId,
                plan,
                billingCycle,
                description,
                contactName,
                contactEmail,
                contactPhone,
            },
            include: {
                restaurant: {
                    select: { id: true, name: true }
                }
            }
        })

        // Create a notification for Super Admins
        const superAdmins = await prisma.user.findMany({
            where: {
                role: {
                    name: 'SUPER_ADMIN'
                }
            }
        })

        const displayContact = contactName || "N/A";
        const displayEmail = contactEmail || "N/A";
        const displayPhone = contactPhone || "N/A";
        const contactInfo = `(Contact: ${displayContact}, Email: ${displayEmail}, Phone: ${displayPhone})`;

        for (const admin of superAdmins) {
            await prisma.notification.create({
                data: {
                    userId: admin.id,
                    message: `New subscription upgrade request from "${subscriptionRequest.restaurant?.name || 'New Restaurant'}" for ${plan} plan (${billingCycle}). ${contactInfo}`,
                    isRead: false
                }
            })
        }

        return successResponse(subscriptionRequest, 'Subscription request submitted successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to submit subscription request', error.message, 500)
    }
}
