import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { date, restaurantId } = await req.json();

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const targetDate = date ? new Date(date) : new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    // Fetch daily sales data
    const orders = await prisma.order.findMany({
      where: {
        branch: { restaurantId },
        createdAt: { gte: start, lte: end },
        status: "DELIVERED",
      },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const orderCount = orders.length;

    const itemCounts: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.menuItem.name;
        itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
      });
    });

    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topItem = sortedItems[0] ? `${sortedItems[0][0]} (${sortedItems[0][1]} sold)` : "No items sold";

    const systemPrompt = `You are a data analyst for a restaurant. Your job is to convert raw sales data into a professional and clear summary for the restaurant owner. 
    Focus on key metrics: revenue, order count, and top items. 
    Use a bulleted list for clarity. If the data is empty, mention that no sales were recorded.`;

    const userPrompt = `Restaurant Sales Summary for ${targetDate.toDateString()}
    - Total Orders: ${orderCount}
    - Total Revenue: $${totalRevenue.toFixed(2)}
    - Top Selling Item: ${topItem}
    - Source Breakdown: (POS vs Website)
    
    Please provide a concise, professional performance summary.`;

    const summary = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
