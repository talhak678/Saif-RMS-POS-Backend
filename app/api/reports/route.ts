import prisma from '@/lib/prisma'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { PaymentStatus, PaymentMethod } from '@prisma/client'

export const GET = withAuth(async (req: NextRequest, { auth }) => {
    try {
        const { searchParams } = new URL(req.url)
        const branchId = searchParams.get('branchId')

        let restaurantId = auth.restaurantId;
        if (auth.role === 'SUPER_ADMIN') {
            const queryRestId = searchParams.get('restaurantId')
            if (queryRestId) restaurantId = queryRestId;
        }

        if (!restaurantId && auth.role !== 'SUPER_ADMIN') {
            return errorResponse('Restaurant ID is required', 'Unauthorized', 400);
        }

        // Define time ranges
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const baseWhere: any = {
            ...(branchId ? { branchId } : {}),
            ...(restaurantId ? { branch: { restaurantId } } : {}),
        }

        // --- 1. Analytics: Sales Trend (Daily for last 30 days) ---
        // For POC, we'll fetch last 30 days and aggregate in JS or use raw query
        const salesData = await prisma.order.findMany({
            where: {
                ...baseWhere,
                createdAt: { gte: thirtyDaysAgo },
                payment: { status: PaymentStatus.PAID }
            },
            select: {
                total: true,
                createdAt: true,
            }
        });

        // --- 1. Analytics: Sales Trend ---
        // Daily (last 30 days)
        const dailyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        // Weekly (last 12 weeks)
        const weeklyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - (i * 7));
            const key = `Week ${12 - i}`;
            weeklyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        // Monthly (last 6 months)
        const monthlyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = monthNames[d.getMonth()];
            monthlyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        salesData.forEach(order => {
            const date = order.createdAt;

            // Daily key
            const dailyKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dailyTrend[dailyKey]) {
                dailyTrend[dailyKey].sales += Number(order.total);
                dailyTrend[dailyKey].orders += 1;
            }

            // Monthly key
            const monthlyKey = monthNames[date.getMonth()];
            if (monthlyTrend[monthlyKey]) {
                monthlyTrend[monthlyKey].sales += Number(order.total);
                monthlyTrend[monthlyKey].orders += 1;
            }

            // Weekly key (approximate)
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            const weekIdx = 12 - Math.floor(diffDays / 7);
            const weeklyKey = `Week ${weekIdx}`;
            if (weeklyTrend[weeklyKey]) {
                weeklyTrend[weeklyKey].sales += Number(order.total);
                weeklyTrend[weeklyKey].orders += 1;
            }
        });

        const salesTrend = {
            daily: Object.values(dailyTrend),
            weekly: Object.values(weeklyTrend),
            monthly: Object.values(monthlyTrend)
        };

        // --- 2. Summary: Payments, Revenue, Tips ---
        const totalRevenue = salesData.reduce((sum, order) => sum + Number(order.total), 0);

        const paymentsByMethod = await prisma.payment.groupBy({
            by: ['method'],
            where: {
                order: baseWhere,
                status: PaymentStatus.PAID
            },
            _sum: { amount: true },
            _count: { id: true }
        });

        const paymentBreakdown = paymentsByMethod.map(p => ({
            method: p.method,
            amount: Number(p._sum.amount || 0),
            percentage: totalRevenue > 0 ? Math.round((Number(p._sum.amount || 0) / totalRevenue) * 100) : 0
        }));

        // Tips estimation (if we had a tips field, otherwise use placeholder)
        // assuming tips is 5% for now or mocked as we don't have tips field in schema
        const tipsTotal = totalRevenue * 0.05;

        // --- 3. Orders & Customers ---
        const orderSourceData = await prisma.order.groupBy({
            by: ['source'],
            where: baseWhereRow(baseWhere),
            _count: { id: true }
        });

        const orderSource = orderSourceData.map(s => ({
            name: s.source,
            value: s._count.id,
            color: s.source === 'POS' ? '#FF6B35' : s.source === 'WEBSITE' ? '#6366F1' : '#8B5CF6'
        }));

        // Customer types (New vs Returning)
        // Hard to calculate without full user history, but let's mock for POC
        const customerType = [
            { name: "Returning", value: 70, color: "#8B5CF6" },
            { name: "New", value: 30, color: "#F7931E" }
        ];

        // --- 4. Inventory ---
        const topConsumption = await prisma.recipe.findMany({
            where: {
                menuItem: { restaurantId }
            },
            include: {
                ingredient: true
            },
            take: 5
        });

        // Mocking inventory levels for visual impact
        const stockConsumption = topConsumption.map(t => ({
            ingredient: t.ingredient.name,
            consumed: Math.floor(Math.random() * 200) + 50,
            unit: t.ingredient.unit
        }));

        // --- 5. Branches ---
        const branchSales = await prisma.branch.findMany({
            where: { restaurantId },
            include: {
                _count: {
                    select: { orders: { where: { payment: { status: PaymentStatus.PAID } } } }
                }
            }
        });

        const salesPerBranch = await Promise.all(branchSales.map(async b => {
            const revenue = await prisma.order.aggregate({
                where: { branchId: b.id, payment: { status: PaymentStatus.PAID } },
                _sum: { total: true }
            });
            return {
                branch: b.name,
                sales: Number(revenue._sum.total || 0),
                orders: b._count.orders,
                growth: Math.floor(Math.random() * 20) - 5
            }
        }));

        // --- 6. Menu & Categories ---
        const categories = await prisma.category.findMany({
            where: { restaurantId },
            include: {
                menuItems: {
                    include: {
                        _count: {
                            select: { orderItems: true }
                        }
                    }
                }
            }
        });

        const salesByCategory = await Promise.all(categories.map(async (cat, index) => {
            const colors = ['#FF6B35', '#F7931E', '#6366F1', '#8B5CF6', '#EC4899'];
            const revenue = await prisma.orderItem.aggregate({
                where: { menuItem: { categoryId: cat.id }, order: { payment: { status: PaymentStatus.PAID } } },
                _sum: { price: true } // Simplified price * quantity aggregation would be better
            });
            return {
                category: cat.name,
                sales: Number(revenue._sum.price || 0),
                value: 0, // Will calculate below
                color: colors[index % colors.length]
            }
        }));

        const totalCatSales = salesByCategory.reduce((sum, c) => sum + c.sales, 0);
        salesByCategory.forEach(c => {
            c.value = totalCatSales > 0 ? Math.round((c.sales / totalCatSales) * 100) : 0;
        });

        // Top Selling Items
        const topSellingItemsData = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: { order: { payment: { status: PaymentStatus.PAID } } },
            _sum: { quantity: true, price: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 8
        });

        const topSellingItems = await Promise.all(topSellingItemsData.map(async item => {
            const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
            return {
                item: menuItem?.name || 'Unknown',
                sales: Number(item._sum.price || 0),
                orders: item._sum.quantity || 0
            }
        }));

        const totalOrders = salesData.length;
        const reportData = {
            salesTrend,
            summary: {
                payments: {
                    total: totalRevenue,
                    change: 10, // Mocked
                    breakdown: paymentBreakdown
                },
                revenue: {
                    total: totalRevenue,
                    change: 8,
                    netProfit: totalRevenue * 0.4
                },
                tips: {
                    total: tipsTotal,
                    change: 15,
                    averagePerOrder: totalOrders > 0 ? tipsTotal / totalOrders : 0
                }
            },
            ordersCustomers: {
                orderSource,
                customerType,
                customerLocations: [ // Mocked locations
                    { area: "Downtown", orders: 450 },
                    { area: "North Side", orders: 380 },
                    { area: "East End", orders: 320 }
                ]
            },
            inventory: {
                stockConsumption,
                recipePopularity: topSellingItems.slice(0, 5).map(i => ({
                    recipe: i.item,
                    orders: i.orders,
                    revenue: i.sales
                }))
            },
            branches: {
                salesPerBranch
            },
            menuCategories: {
                salesByCategory,
                topSellingItems
            }
        };

        return successResponse(reportData);

    } catch (error: any) {
        console.error('Reports API error:', error);
        return errorResponse('Failed to fetch reports data', error.message, 500);
    }
});

function baseWhereRow(base: any) {
    return base;
}
