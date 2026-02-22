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

        // --- 1. Define Time Ranges ---
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

        const baseWhere: any = {
            ...(branchId ? { branchId } : {}),
            ...(restaurantId ? { branch: { restaurantId } } : {}),
        }

        // --- 2. Fetch Current & Previous Period Sales Data ---
        const [currentPeriodSales, previousPeriodSales] = await Promise.all([
            prisma.order.findMany({
                where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo }, payment: { status: PaymentStatus.PAID } },
                select: { total: true, createdAt: true, customerId: true, orderNo: true }
            }),
            prisma.order.findMany({
                where: { ...baseWhere, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, payment: { status: PaymentStatus.PAID } },
                select: { total: true }
            })
        ]);

        // --- 3. Analytics: Sales Trend ---
        const dailyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
            const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = monthNames[d.getMonth()];
            monthlyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        const weeklyTrend: Record<string, { date: string, sales: number, orders: number }> = {};
        for (let i = 11; i >= 0; i--) {
            const key = `Week ${12 - i}`;
            weeklyTrend[key] = { date: key, sales: 0, orders: 0 };
        }

        currentPeriodSales.forEach(order => {
            const date = order.createdAt;
            const dailyKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (dailyTrend[dailyKey]) {
                dailyTrend[dailyKey].sales += Number(order.total);
                dailyTrend[dailyKey].orders += 1;
            }
            const monthlyKey = monthNames[date.getMonth()];
            if (monthlyTrend[monthlyKey]) {
                monthlyTrend[monthlyKey].sales += Number(order.total);
                monthlyTrend[monthlyKey].orders += 1;
            }
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
            const weekIdx = 12 - Math.floor(diffDays / 7);
            const weeklyKey = `Week ${weekIdx}`;
            if (weeklyTrend[weeklyKey]) {
                weeklyTrend[weeklyKey].sales += Number(order.total);
                weeklyTrend[weeklyKey].orders += 1;
            }
        });

        // --- 4. Summary & Growth Logic ---
        const currentRevenue = currentPeriodSales.reduce((sum, o) => sum + Number(o.total), 0);
        const previousRevenue = previousPeriodSales.reduce((sum, o) => sum + Number(o.total), 0);
        const revChange = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 100;

        const currentOrders = currentPeriodSales.length;
        const previousOrders = previousPeriodSales.length;
        const orderChange = previousOrders > 0 ? Math.round(((currentOrders - previousOrders) / previousOrders) * 100) : 100;

        // --- 5. Customers: New vs Returning (Truly Dynamic) ---
        const uniqueCustomerIds = [...new Set(currentPeriodSales.map(o => o.customerId).filter(Boolean))];
        let returningCount = 0;
        let newCount = 0;

        if (uniqueCustomerIds.length > 0) {
            const orderCounts = await prisma.order.groupBy({
                by: ['customerId'],
                where: { customerId: { in: uniqueCustomerIds as string[] }, payment: { status: PaymentStatus.PAID } },
                _count: { id: true }
            });
            orderCounts.forEach(c => {
                if (c._count.id > 1) returningCount++;
                else newCount++;
            });
        }

        // --- 6. Inventory: Theoretical Stock Consumption (Truly Dynamic) ---
        const stockUsage = await prisma.orderItem.findMany({
            where: { order: { ...baseWhere, createdAt: { gte: thirtyDaysAgo }, payment: { status: PaymentStatus.PAID } } },
            include: {
                menuItem: {
                    include: { recipes: { include: { ingredient: true } } }
                }
            }
        });

        const ingredientConsumption: Record<string, { ingredient: string, consumed: number, unit: string }> = {};
        stockUsage.forEach(item => {
            item.menuItem.recipes.forEach(recipe => {
                const name = recipe.ingredient.name;
                if (!ingredientConsumption[name]) {
                    ingredientConsumption[name] = { ingredient: name, consumed: 0, unit: recipe.ingredient.unit };
                }
                ingredientConsumption[name].consumed += (recipe.quantity * item.quantity);
            });
        });

        // --- 7. Branches Comparison & Growth ---
        const branches = await prisma.branch.findMany({
            where: { restaurantId },
            include: {
                orders: {
                    where: { payment: { status: PaymentStatus.PAID }, createdAt: { gte: sixtyDaysAgo } },
                    select: { total: true, createdAt: true }
                }
            }
        });

        const salesPerBranch = branches.map(b => {
            const curr = b.orders.filter(o => o.createdAt >= thirtyDaysAgo).reduce((s, o) => s + Number(o.total), 0);
            const prev = b.orders.filter(o => o.createdAt < thirtyDaysAgo).reduce((s, o) => s + Number(o.total), 0);
            const growth = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 100;
            return {
                branch: b.name,
                sales: curr,
                orders: b.orders.filter(o => o.createdAt >= thirtyDaysAgo).length,
                growth
            }
        });

        // --- 8. Menu Categories ---
        const categories = await prisma.category.findMany({
            where: { restaurantId },
            include: {
                menuItems: {
                    include: {
                        orderItems: {
                            where: { order: { payment: { status: PaymentStatus.PAID }, createdAt: { gte: thirtyDaysAgo } } }
                        }
                    }
                }
            }
        });

        const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#10B981', '#06B6D4', '#F59E0B'];
        const salesByCategory = categories.map((cat, idx) => {
            let total = 0;
            cat.menuItems.forEach(mi => {
                mi.orderItems.forEach(oi => total += (Number(oi.price) * oi.quantity));
            });
            return { category: cat.name, sales: total, value: total, color: colors[idx % colors.length] };
        });

        const totalCatSales = salesByCategory.reduce((s, c) => s + c.sales, 0);
        salesByCategory.forEach(c => {
            c.value = totalCatSales > 0 ? Math.round((c.sales / totalCatSales) * 100) : 0;
        });

        // Top Selling Items
        const topSellingItemsData = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            where: { order: { ...baseWhere, payment: { status: PaymentStatus.PAID }, createdAt: { gte: thirtyDaysAgo } } },
            _sum: { quantity: true, price: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 10
        });

        const topSellingItems = await Promise.all(topSellingItemsData.map(async item => {
            const mi = await prisma.menuItem.findUnique({ where: { id: item.menuItemId }, select: { name: true } });
            return {
                item: mi?.name || 'Unknown',
                sales: Number(item._sum.price || 0),
                orders: item._sum.quantity || 0
            }
        }));

        // Locations Extraction
        const ordersWithAddress = await prisma.order.findMany({
            where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo }, deliveryAddress: { not: null } },
            select: { deliveryAddress: true }
        });
        const locationsMap: Record<string, number> = {};
        ordersWithAddress.forEach(o => {
            const addr = o.deliveryAddress || "";
            // Simplified area extraction: take last part of comma separated string or just first word
            const parts = addr.split(',');
            const area = parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();
            if (area) locationsMap[area] = (locationsMap[area] || 0) + 1;
        });
        const customerLocations = Object.entries(locationsMap)
            .map(([area, orders]) => ({ area, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);

        // Order Source Distribution
        const orderSources = await prisma.order.groupBy({
            by: ['source'],
            where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo }, payment: { status: PaymentStatus.PAID } },
            _count: { id: true }
        });
        const orderSource = orderSources.map((s, idx) => ({
            name: s.source,
            value: s._count.id,
            color: colors[idx % colors.length]
        }));

        // --- 9. Build Final Report ---
        const reportData = {
            salesTrend: {
                daily: Object.values(dailyTrend),
                weekly: Object.values(weeklyTrend),
                monthly: Object.values(monthlyTrend)
            },
            summary: {
                payments: {
                    total: currentRevenue,
                    change: orderChange,
                    count: currentOrders
                },
                revenue: {
                    total: currentRevenue,
                    change: revChange,
                    netProfit: currentRevenue * 0.4
                },
                tips: {
                    total: 0,
                    change: 0,
                    averagePerOrder: 0
                }
            },
            ordersCustomers: {
                orderSource: orderSource.length > 0 ? orderSource : [{ name: 'No Data', value: 0, color: '#3B82F6' }],
                customerType: [
                    { name: "Returning", value: returningCount, color: "#3B82F6" },
                    { name: "New", value: newCount, color: "#6366F1" }
                ],
                customerLocations: customerLocations.length > 0 ? customerLocations : [{ area: "No Data", orders: 0 }]
            },
            inventory: {
                stockConsumption: Object.values(ingredientConsumption).slice(0, 10),
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
