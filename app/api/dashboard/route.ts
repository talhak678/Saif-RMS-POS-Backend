import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { OrderStatus, PaymentStatus } from '@prisma/client'

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const restaurantId = searchParams.get('restaurantId')
        const branchId = searchParams.get('branchId')

        // Basic date filtering (last 30 days by default)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const baseWhere: any = {
            createdAt: { gte: thirtyDaysAgo },
            ...(branchId ? { branchId } : {}),
            ...(restaurantId ? { branch: { restaurantId } } : {}),
        }

        // 1. Total Revenue (from completed/paid orders)
        const revenueData = await prisma.order.aggregate({
            where: {
                ...baseWhere,
                payment: { status: PaymentStatus.PAID },
            },
            _sum: { total: true },
        })

        // 2. Total Orders
        const totalOrders = await prisma.order.count({
            where: baseWhere,
        })

        // 3. Order Status Breakdown
        const statusBreakdown = await prisma.order.groupBy({
            by: ['status'],
            where: baseWhere,
            _count: { id: true },
        })

        // 4. Top Selling Items (Basic)
        const topItems = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: {
                order: baseWhere,
            },
            _sum: { quantity: true },
            orderBy: {
                _sum: { quantity: 'desc' },
            },
            take: 5,
        })

        // Fetch names for top items
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

        // 5. New Customers in this period
        const newCustomers = await prisma.customer.count({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
        })

        const dashboardData = {
            totalRevenue: revenueData._sum.total || 0,
            totalOrders,
            newCustomers,
            statusBreakdown: statusBreakdown.reduce((acc: any, curr) => {
                acc[curr.status] = curr._count.id
                return acc
            }, {}),
            topItems: topItemsWithNames,
        }

        return successResponse(dashboardData)
    } catch (error: any) {
        console.error('Dashboard Error:', error)
        return errorResponse('Failed to fetch dashboard data', error.message, 500)
    }
}
