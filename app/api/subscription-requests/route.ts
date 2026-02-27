import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionRequestSchema, subscriptionRequestUpdateSchema } from '@/lib/validations/subscription-request'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')

        // Security check: If not super admin, they can ONLY see their own restaurant's requests
        if (auth.role !== 'SUPER_ADMIN') {
            if (!auth.restaurantId) {
                return errorResponse('Restaurant ID not found for this user', null, 403)
            }
            // Force filter to their own restaurant
            const requests = await prisma.subscriptionRequest.findMany({
                where: { restaurantId: auth.restaurantId },
                include: {
                    restaurant: { select: { id: true, name: true, slug: true } }
                },
                orderBy: { createdAt: 'desc' },
            })
            return successResponse(requests)
        }

        // For SUPER_ADMIN: Filter by provided restaurantId or show all
        const requests = await prisma.subscriptionRequest.findMany({
            where: {
                ...(restaurantId ? { restaurantId: restaurantId } : {}),
            },
            include: {
                restaurant: { select: { id: true, name: true, slug: true } }
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
                    message: `New subscription upgrade request from "${(subscriptionRequest as any).restaurant?.name || 'New Restaurant'}" for ${plan} plan (${billingCycle}). ${contactInfo}`,
                    isRead: false
                }
            })
        }

        return successResponse(subscriptionRequest, 'Subscription request submitted successfully', 201)
    } catch (error: any) {
        return errorResponse('Failed to submit subscription request', error.message, 500)
    }
}
