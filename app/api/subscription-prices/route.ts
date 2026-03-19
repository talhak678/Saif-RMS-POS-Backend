import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { subscriptionPriceSchema } from '@/lib/validations/subscription-price'
import { withAuth } from '@/lib/with-auth'
import { verifyAuthToken } from '@/lib/auth' // Aapko apni auth utility import karni hogi. Ex: verifyJwt(token) ya getServerSession()

// GET request se withAuth hata diya taake public (unauthorized) requests bhi aa sakein
export const GET = async (req: NextRequest) => {
    try {
        const { searchParams } = new URL(req.url)
        const queryRestaurantId = searchParams.get('restaurantId')
        const isDefaultQuery = searchParams.get('isDefault') === 'true'

        // Manually check token/auth session
        const authHeader = req.headers.get('authorization')
        let authUser: any = null;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                // Replace `verifyAuthToken` with your actual token verification function
                authUser = await verifyAuthToken(token); 
            } catch (err) {
                // Token invalid ho gaya, authUser null hi rahega
                console.log("Invalid token, treating as public request.");
            }
        }

        let whereClause: any = { isActive: true };

        // AGAR USER LOGGED IN HAI
        if (authUser) {
            const targetRestaurantId = queryRestaurantId || (authUser.role !== 'SUPER_ADMIN' ? authUser.restaurantId : null);
            
            whereClause = {
                ...whereClause,
                OR: [
                    { restaurantId: null }, // Default prices
                    ...(targetRestaurantId ? [{ restaurantId: targetRestaurantId }] : []) // Specifically for this restaurant
                ],
                ...(searchParams.has('isDefault') ? { isDefault: isDefaultQuery } : {}),
            };
        } 
        // AGAR USER LOGGED IN NAHI HAI (UNAUTHORIZED / PUBLIC)
        else {
            // Sirf Default wale dikhao
            whereClause = {
                ...whereClause,
                isDefault: true
            };
        }

        const prices = await (prisma as any).subscriptionPrice.findMany({
            where: whereClause,
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        })

        return successResponse(prices)
    } catch (error: any) {
        return errorResponse('Failed to fetch subscription prices', error.message, 500)
    }
}

// POST wese hi protected rahega withAuth ke sath
export const POST = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const body = await req.json()
        const validation = subscriptionPriceSchema.safeParse(body)

        if (!validation.success) {
            return errorResponse('Validation failed', validation.error.flatten().fieldErrors, 400)
        }

        let { restaurantId, plan, price, billingCycle, isActive, features, isDefault } = validation.data

        // Logic: if restaurantId is provided, it's NOT default. If not provided, it IS default.
        if (restaurantId) {
            isDefault = false;
        } else {
            isDefault = true;
            restaurantId = null as any; // Explicitly set to null for prisma if needed
        }

        // Only Super Admin can create default pricing or pricing for any restaurant
        if (auth.role !== 'SUPER_ADMIN') {
            if (isDefault || auth.restaurantId !== restaurantId) {
                return errorResponse('Unauthorized to create this pricing', null, 403)
            }
        }

        const subscriptionPrice = await (prisma as any).subscriptionPrice.create({
            data: {
                restaurantId: restaurantId || null,
                plan,
                price,
                billingCycle,
                isActive,
                isDefault,
                features: features ?? [],
            },
            include: {
                restaurant: {
                    select: { id: true, name: true, slug: true }
                }
            }
        })

        // Also update the restaurant's active subscription status and dates if restaurantId exists
        if (restaurantId) {
            const startDate = new Date();
            const endDate = new Date();
            if (billingCycle === 'MONTHLY') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (billingCycle === 'YEARLY') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }

            await prisma.restaurant.update({
                where: { id: restaurantId },
                data: {
                    subscription: plan,
                    subStartDate: startDate,
                    subEndDate: endDate
                }
            })
        }

        return successResponse(subscriptionPrice, 'Subscription price created successfully', 201)
    } catch (error: any) {
        if (error.code === 'P2002') {
            return errorResponse('A pricing entry for this plan and billing cycle already exists', null, 409)
        }
        return errorResponse('Failed to create subscription price', error.message, 500)
    }
})
