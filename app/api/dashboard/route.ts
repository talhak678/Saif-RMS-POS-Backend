import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')

        // Multi-tenancy logic
        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        // Date range — last 30 days by default
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const baseWhere: any = {
            createdAt: { gte: thirtyDaysAgo },
            ...(branchId ? { branchId } : {}),
            ...(restaurantId ? { branch: { restaurantId } } : {}),
        }

        // 1. Total Revenue (paid orders only)
        const revenueData = await prisma.order.aggregate({
            where: {
                ...baseWhere,
                payment: { status: PaymentStatus.PAID },
            },
            _sum: { total: true },
        })

        // 2. Total Orders
        const totalOrders = await prisma.order.count({ where: baseWhere })

        // 3. Total Website Orders
        const websiteOrders = await prisma.order.count({
            where: { ...baseWhere, source: 'WEBSITE' },
        })

        // 4. Avg Order Value
        const avgData = await prisma.order.aggregate({
            where: baseWhere,
            _avg: { total: true },
        })

        // 5. Order Status Breakdown
        const statusGrouped = await prisma.order.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { id: true },
        })

        // 6. Orders by Source (platform)
        const sourceGrouped = await prisma.order.groupBy({
            by: ['source'],
            where: baseWhere,
            _count: { id: true },
        })

        // 7. Top Selling Items
        const topItems = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: { order: baseWhere },
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
        })

        const topItemsWithNames = await Promise.all(
            topItems.map(async (item) => {
                const menuItem = await prisma.menuItem.findUnique({
                    where: { id: item.menuItemId },
                    select: { name: true },
                })
                return {
                    name: menuItem?.name || 'Unknown',
                    quantity: item._sum.quantity,
                }
            })
        )

        // 8. New Customers
        const newCustomers = await prisma.customer.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                ...(restaurantId ? { restaurantId } : {}),
            },
        })

        // 9. Total Customers
        const totalCustomers = await prisma.customer.count({
            where: {
                ...(restaurantId ? { restaurantId } : {}),
            },
        })

        // 10. Monthly Revenue for chart (last 12 months)
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
        twelveMonthsAgo.setDate(1)
        twelveMonthsAgo.setHours(0, 0, 0, 0)

        const monthlyOrders = await prisma.order.findMany({
            where: {
                ...(branchId ? { branchId } : {}),
                ...(restaurantId ? { branch: { restaurantId } } : {}),
                createdAt: { gte: twelveMonthsAgo },
                payment: { status: PaymentStatus.PAID },
            },
            select: { total: true, createdAt: true },
        })

        // Group by month
        const monthlyMap: Record<string, number> = {}
        monthlyOrders.forEach((o) => {
            const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`
            monthlyMap[key] = (monthlyMap[key] || 0) + Number(o.total)
        })

        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlySales = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(twelveMonthsAgo)
            d.setMonth(d.getMonth() + i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return {
                month: monthLabels[d.getMonth()],
                revenue: monthlyMap[key] || 0,
            }
        })

        // 11. Recent Reviews
        const recentReviews = await prisma.review.findMany({
            where: {
                order: {
                    ...(restaurantId ? { branch: { restaurantId } } : {}),
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                order: { include: { customer: { select: { name: true } } } },
            },
        })

        const dashboardData = {
            totalRevenue: revenueData._sum.total || 0,
            totalOrders,
            websiteOrders,
            avgOrderValue: avgData._avg.total || 0,
            newCustomers,
            totalCustomers,
            statusBreakdown: statusGrouped.reduce((acc: any, curr) => {
                acc[curr.status] = curr._count.id
                return acc
            }, {}),
            sourceBreakdown: sourceGrouped.reduce((acc: any, curr) => {
                acc[curr.source] = curr._count.id
                return acc
            }, {}),
            topItems: topItemsWithNames,
            monthlySales,
            recentReviews: recentReviews.map((r) => ({
                id: r.id,
                rating: r.rating,
                comment: r.comment,
                customerName: r.order?.customer?.name || 'Guest',
                createdAt: r.createdAt,
            })),
        }

        return successResponse(dashboardData)
    } catch (error: any) {
        return errorResponse('Failed to fetch dashboard data', error.message, 500)
    }
})
