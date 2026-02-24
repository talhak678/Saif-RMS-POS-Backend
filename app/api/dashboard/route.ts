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

        const { start, end, prevStart, prevEnd } = getPeriodDates(period)

        const tenantFilter: any = {
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
                ...tenantFilter,
                createdAt: { gte: twelveMonthsAgo },
                payment: { status: PaymentStatus.PAID },
            },
            select: { total: true, createdAt: true },
        })

        const monthlyMap: Record<string, number> = {}
        const monthlyCountMap: Record<string, number> = {}
        monthlyOrders.forEach((o) => {
            const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`
            monthlyMap[key] = (monthlyMap[key] || 0) + Number(o.total)
            monthlyCountMap[key] = (monthlyCountMap[key] || 0) + 1
        })

        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlySales = Array.from({ length: 12 }, (_, i) => {
            const d = new Date(twelveMonthsAgo)
            d.setMonth(d.getMonth() + i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return {
                month: monthLabels[d.getMonth()],
                revenue: monthlyMap[key] || 0,
                orders: monthlyCountMap[key] || 0,
            }
        })

        // ── 11. Hourly Orders (today) ─────────────────────────────────────────
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
        const todayOrders = await prisma.order.findMany({
            where: { ...tenantFilter, createdAt: { gte: todayStart } },
            select: { createdAt: true },
        })

        const hourlyMap: number[] = Array(24).fill(0)
        todayOrders.forEach((o) => { hourlyMap[o.createdAt.getHours()]++ })
        const hourlyOrders = hourlyMap.map((count, h) => ({ hour: `${h}:00`, count }))

        // ── 12. Category Revenue ──────────────────────────────────────────────
        const categoryRevRaw = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: { order: baseWhere },
            _sum: { quantity: true, price: true },
        })

        const categoryMap: Record<string, { revenue: number; quantity: number }> = {}
        await Promise.all(
            categoryRevRaw.map(async (item) => {
                const mi = await prisma.menuItem.findUnique({
                    where: { id: item.menuItemId },
                    select: { category: { select: { name: true } } },
                })
                const catName = mi?.category?.name || 'Unknown'
                if (!categoryMap[catName]) categoryMap[catName] = { revenue: 0, quantity: 0 }
                categoryMap[catName].revenue += Number(item._sum.price || 0)
                categoryMap[catName].quantity += Number(item._sum.quantity || 0)
            })
        )

        const categoryRevenue = Object.entries(categoryMap)
            .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), quantity: v.quantity }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 6)

        // ── 13. Recent Reviews ────────────────────────────────────────────────
        const recentReviews = await prisma.review.findMany({
            where: { order: { ...tenantFilter } },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                order: { include: { customer: { select: { name: true } } } },
            },
        })

        // ── 14. Growth helpers ────────────────────────────────────────────────
        const growth = (curr: number, prev: number) =>
            prev === 0 ? null : Math.round(((curr - prev) / prev) * 100)

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