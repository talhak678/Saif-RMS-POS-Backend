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

    // Breakdown by source
    const sourceBreakdown = orders.reduce((acc, order) => {
      acc[order.source] = (acc[order.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const itemCounts: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.menuItem.name;
        itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
      });
    });

    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topItems = sortedItems.slice(0, 10).map(i => `${i[0]} (${i[1]} units)`).join(", ");

    const systemPrompt = `You are an expert restaurant business analyst. Your job is to convert raw sales data into a professional, clear, and actionable daily performance summary for the restaurant owner. 
    Focus on key metrics: revenue, order count, top performing items, and order sources. 
    Use a professional tone. If data is missing, report the status as "No activity".`;

    const userPrompt = `Restaurant Performance Report for ${targetDate.toDateString()}
    
    KEY METRICS:
    - Total Orders: ${orderCount}
    - Total Revenue: $${totalRevenue.toFixed(2)}
  
    
    SOURCE BREAKDOWN:
    - Website Orders: ${sourceBreakdown.WEBSITE || 0}
    - POS Orders: ${sourceBreakdown.POS || 0}
    - Mobile Orders: ${sourceBreakdown.MOBILE || 0}
    
    Please provide a concise but professional performance summary. Include a brief note on which channel performed better today.`;

    const summary = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
