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
        console.log('🔍 [PUBLIC API] Fetching restaurant with slug:', slug);

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

        console.log('🏪 [PUBLIC API] Restaurant found:', restaurant ? 'YES' : 'NO');
        console.log('🆔 [PUBLIC API] Restaurant ID:', restaurant?.id);
        console.log('⚙️ [PUBLIC API] WebsiteConfig exists:', restaurant?.websiteConfig ? 'YES' : 'NO');

        if (!restaurant) {
            console.log('❌ [PUBLIC API] Restaurant not found for slug:', slug);
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

        console.log('✅ [PUBLIC API] Returning data for:', restaurant.name);
        console.log('📊 [PUBLIC API] Stats:', {
            promos: restaurant.promos.length,
            faqs: restaurant.faqItems.length,
            blogs: restaurant.blogPosts.length,
            categories: restaurant.categories.length
        });

        return successResponse(data)
    } catch (error: any) {
        console.error('💥 [PUBLIC API] Error fetching website data:', error);
        console.error('💥 [PUBLIC API] Error name:', error.name);
        console.error('💥 [PUBLIC API] Error message:', error.message);
        console.error('💥 [PUBLIC API] Error stack:', error.stack);
        return errorResponse('Failed to fetch public website data', error.message, 500)
    }
}
