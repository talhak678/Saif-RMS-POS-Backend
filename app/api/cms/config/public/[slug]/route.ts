import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'

// GET public configuration by restaurant slug
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        const restaurant = await prisma.restaurant.findUnique({
            where: { slug },
            include: {
                websiteConfig: true,
                promos: { where: { isActive: true } },
                faqItems: true,
                blogPosts: { orderBy: { publishedAt: 'desc' } },
                categories: {
                    include: {
                        menuItems: {
                            where: { isAvailable: true }
                        }
                    }
                }
            }
        })

        if (!restaurant) {
            return errorResponse('Restaurant not found', null, 404)
        }

        const data = {
            restaurantLogo: restaurant.logo,
            restaurantName: restaurant.name,
            config: restaurant.websiteConfig || {
                backgroundColor: '#ffffff',
                primaryColor: '#ff0000',
                configJson: {}
            },
            promos: restaurant.promos,
            faqs: restaurant.faqItems,
            blogs: restaurant.blogPosts,
            menu: restaurant.categories
        }

        return successResponse(data)
    } catch (error: any) {
        return errorResponse('Failed to fetch public website data', error.message, 500)
    }
}
