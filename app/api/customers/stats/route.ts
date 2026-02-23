import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        let restaurantId = auth.restaurantId;

        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
        }

        if (!restaurantId) {
            return errorResponse('Restaurant ID is required')
        }

        const now = new Date()
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

        // All customers with their order counts + last order date
        const allCustomers = await prisma.customer.findMany({
            where: { restaurantId },
            include: {
                _count: { select: { orders: true } },
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true }
                }
            }
        })

        const totalCustomers = allCustomers.length
        const newCustomersCount = allCustomers.filter(c => c.createdAt >= thirtyDaysAgo).length
        const repeatBuyersCount = allCustomers.filter(c => c._count.orders > 1).length
        const vipCustomersCount = allCustomers.filter(c => c._count.orders > 20).length
        const frequentBuyersCount = allCustomers.filter(c => c._count.orders > 5).length
        const oneTimeBuyersCount = allCustomers.filter(c => c._count.orders === 1).length
        const zeroOrdersCount = allCustomers.filter(c => c._count.orders === 0).length
        const dormantCount = allCustomers.filter(c => {
            if (c._count.orders === 0) return false
            const lastOrder = c.orders[0]?.createdAt
            return lastOrder ? lastOrder < sixtyDaysAgo : false
        }).length

        // Rates calculated against total customers
        const repeatRate = totalCustomers > 0 ? (repeatBuyersCount / totalCustomers) * 100 : 0
        const retentionRate = totalCustomers > 0 ? ((totalCustomers - zeroOrdersCount) / totalCustomers) * 100 : 0

        // Financial aggregates
        const orderStats = await prisma.order.aggregate({
            where: {
                branch: { restaurantId },
                status: { not: 'CANCELLED' }
            },
            _sum: { total: true },
            _count: { id: true }
        })

        const totalRevenue = Number(orderStats._sum.total ?? 0)
        const totalOrdersCount = orderStats._count.id
        const averageOrderValue = totalOrdersCount > 0 ? totalRevenue / totalOrdersCount : 0

        return successResponse({
            summary: {
                totalCustomers,
                repeatRate: repeatRate.toFixed(2) + '%',
                averageOrderValue: averageOrderValue.toFixed(2),
                retentionRate: retentionRate.toFixed(2) + '%'
            },
            segments: {
                newCustomers: newCustomersCount,
                vipCustomers: vipCustomersCount,
                repeatBuyers: repeatBuyersCount,
                zeroOrders: zeroOrdersCount,
                dormantCustomers: dormantCount,
                frequentBuyers: frequentBuyersCount,
                cartAbandoners: 0,
                oneTimeBuyers: oneTimeBuyersCount
            }
        })
    } catch (error: any) {
        return errorResponse('Failed to fetch customer stats', error.message, 500)
    }
})
