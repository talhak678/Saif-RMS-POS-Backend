import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { restaurantSchema } from '@/lib/validations/restaurant'
import { addDomainToVercel, removeDomainFromVercel } from '@/lib/vercel'

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const restaurant = await prisma.restaurant.findUnique({
            where: { id },
            include: {
                branches: true,
                settings: true,
                categories: true,
                subscriptionPrices: true
            }
        })

        if (!restaurant) return errorResponse('Restaurant not found', null, 404)
        return successResponse(restaurant)
    } catch (error: any) {
        return errorResponse('Failed to fetch restaurant', error.message, 500)
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await req.json()

        // 1. Fetch current restaurant to check if domain changed
        const currentRestaurant = await prisma.restaurant.findUnique({
            where: { id },
            select: { customDomain: true, domainStatus: true }
        })

        const validation = restaurantSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        const newDomain = validation.data.customDomain?.toLowerCase().trim().replace(/^(https?:\/\/)/, '').replace(/\/$/, '') || null;
        const oldDomain = currentRestaurant?.customDomain || null;
        const domainChanged = newDomain !== oldDomain;

        // Prepare update data
        const updateData: any = { ...validation.data };

        // Handle domain changes
        if (domainChanged) {
            if (newDomain) {
                // Clean domain: remove protocol, trailing slashes
                updateData.customDomain = newDomain;
                updateData.domainStatus = 'PENDING';
            } else {
                // Domain removed
                updateData.customDomain = null;
                updateData.domainStatus = 'NONE';
            }
        }

        // 2. Update DB first
        const restaurant = await prisma.restaurant.update({
            where: { id },
            data: updateData
        })

        // 3. Handle Vercel domain changes (after DB update succeeds)
        if (domainChanged) {
            // Remove old domain from Vercel if it existed
            if (oldDomain) {
                console.log(`🗑️ Removing old domain from Vercel: ${oldDomain}`);
                await removeDomainFromVercel(oldDomain);
            }

            // Add new domain to Vercel if provided
            if (newDomain) {
                console.log('🌐 Adding new domain to Vercel:', newDomain);
                const result = await addDomainToVercel(newDomain);

                if (result && !result.success) {
                    // Domain add failed, update status to FAILED
                    await prisma.restaurant.update({
                        where: { id },
                        data: { domainStatus: 'FAILED' }
                    });
                    console.error('💥 Failed to add domain to Vercel:', result.error);
                }
            }
        }

        return successResponse(restaurant, 'Restaurant updated successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Restaurant not found', null, 404)
        if (error.code === 'P2002') return errorResponse('Restaurant slug already exists')
        return errorResponse('Failed to update restaurant', error.message, 500)
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await prisma.restaurant.delete({ where: { id } })
        return successResponse(null, 'Restaurant deleted successfully')
    } catch (error: any) {
        if (error.code === 'P2025') return errorResponse('Restaurant not found', null, 404)
        return errorResponse('Failed to delete restaurant', error.message, 500)
    }
}
