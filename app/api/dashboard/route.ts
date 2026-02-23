import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { withAuth } from '@/lib/with-auth'

function getPeriodDates(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const now = new Date()
    const end = new Date(now)
    let start = new Date(now)

    if (period === 'today') {
        start.setHours(0, 0, 0, 0)
    } else if (period === '7d') {
        start.setDate(start.getDate() - 7)
    } else if (period === '90d') {
        start.setDate(start.getDate() - 90)
    } else {
        // default 30d
        start.setDate(start.getDate() - 30)
    }

    const diff = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime())
    const prevStart = new Date(prevEnd.getTime() - diff)

    return { start, end, prevStart, prevEnd }
}

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')
        const period = searchParams.get('period') || '30d'

        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
            else restaurantId = undefined;
        }

        // Basic date filtering (last 30 days by default)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const baseWhere: any = {
            createdAt: { gte: thirtyDaysAgo },
            ...(branchId ? { branchId } : {}),
            ...(restaurantId ? { branch: { restaurantId } } : {}),
        }

        const baseWhere: any = { createdAt: { gte: start, lte: end }, ...tenantFilter }
        const prevWhere: any = { createdAt: { gte: prevStart, lte: prevEnd }, ...tenantFilter }

        // ── 1. Current period revenue (paid orders) ──────────────────────────
        const [revenueData, prevRevenueData, salesData, prevSalesData] = await Promise.all([
            prisma.order.aggregate({
                where: { ...baseWhere, payment: { status: PaymentStatus.PAID } },
                _sum: { total: true },
            }),
            prisma.order.aggregate({
                where: { ...prevWhere, payment: { status: PaymentStatus.PAID } },
                _sum: { total: true },
            }),
            // Total Sales = ALL orders (paid + unpaid + pending)
            prisma.order.aggregate({
                where: baseWhere,
                _sum: { total: true },
            }),
            prisma.order.aggregate({
                where: prevWhere,
                _sum: { total: true },
            }),
        ])

        // ── 2. Total Orders with comparison ──────────────────────────────────
        const [totalOrders, prevTotalOrders] = await Promise.all([
            prisma.order.count({ where: baseWhere }),
            prisma.order.count({ where: prevWhere }),
        ])

        // ── 3. Website Orders ─────────────────────────────────────────────────
        const [websiteOrders, prevWebsiteOrders] = await Promise.all([
            prisma.order.count({ where: { ...baseWhere, source: 'WEBSITE' } }),
            prisma.order.count({ where: { ...prevWhere, source: 'WEBSITE' } }),
        ])

        // ── 4. Avg Order Value ────────────────────────────────────────────────
        const avgData = await prisma.order.aggregate({
            where: baseWhere,
            _avg: { total: true },
        })

        // ── 5. Customers ──────────────────────────────────────────────────────
        const [newCustomers, prevNewCustomers, totalCustomers] = await Promise.all([
            prisma.customer.count({
                where: { createdAt: { gte: start, lte: end }, ...(restaurantId ? { restaurantId } : {}) },
            }),
            prisma.customer.count({
                where: { createdAt: { gte: prevStart, lte: prevEnd }, ...(restaurantId ? { restaurantId } : {}) },
            }),
            prisma.customer.count({
                where: { ...(restaurantId ? { restaurantId } : {}) },
            }),
        ])

        // ── 6. Order Status Breakdown ─────────────────────────────────────────
        const statusGrouped = await prisma.order.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { id: true },
        })

        // ── 7. Orders by Source ───────────────────────────────────────────────
        const sourceGrouped = await prisma.order.groupBy({
            by: ['source'],
            where: baseWhere,
            _count: { id: true },
        })

        // ── 8. Orders by Type (DINE_IN, DELIVERY, PICKUP) ────────────────────
        const typeGrouped = await prisma.order.groupBy({
            by: ['type'],
            where: baseWhere,
            _count: { id: true },
        })

        // ── 9. Top Selling Items ──────────────────────────────────────────────
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
                return { name: menuItem?.name || 'Unknown', quantity: item._sum.quantity }
            })
        )

        // ── 10. Monthly Sales (last 12 months, always full year) ─────────────
        const twelveMonthsAgo = new Date()
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
        twelveMonthsAgo.setDate(1)
        twelveMonthsAgo.setHours(0, 0, 0, 0)

        const monthlyOrders = await prisma.order.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
                ...(restaurantId ? { restaurantId } : {})
            },
        })

        const dashboardData = {
            period,
            totalSales: salesData._sum.total || 0,        // ALL orders (any status)
            totalRevenue: revenueData._sum.total || 0,     // Paid orders only
            totalOrders,
            websiteOrders,
            avgOrderValue: avgData._avg.total || 0,
            newCustomers,
            totalCustomers,
            growth: {
                totalSales: growth(Number(salesData._sum.total || 0), Number(prevSalesData._sum.total || 0)),
                revenue: growth(Number(revenueData._sum.total || 0), Number(prevRevenueData._sum.total || 0)),
                orders: growth(totalOrders, prevTotalOrders),
                websiteOrders: growth(websiteOrders, prevWebsiteOrders),
                newCustomers: growth(newCustomers, prevNewCustomers),
            },
            statusBreakdown: statusGrouped.reduce((acc: any, curr) => {
                acc[curr.status] = curr._count.id; return acc
            }, {}),
            sourceBreakdown: sourceGrouped.reduce((acc: any, curr) => {
                acc[curr.source] = curr._count.id; return acc
            }, {}),
            typeBreakdown: typeGrouped.reduce((acc: any, curr) => {
                acc[curr.type] = curr._count.id; return acc
            }, {}),
            topItems: topItemsWithNames,
            monthlySales,
            hourlyOrders,
            categoryRevenue,
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
