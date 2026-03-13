import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { date, restaurantId, instructions } = await req.json();

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const targetDate = date ? new Date(date) : new Date();
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    // 1. Fetch the full Menu Catalog for context
    const menuItems = await prisma.menuItem.findMany({
      where: { category: { restaurantId } },
      include: { category: true }
    });

    const menuContext = menuItems.map(m => `${m.name} (${m.category.name}) - $${m.price}`).join(", ");

    // 2. Fetch daily sales data with full detail
    const orders = await prisma.order.findMany({
      where: {
        branch: { restaurantId },
        createdAt: { gte: start, lte: end },
        status: "DELIVERED",
      },
      include: {
        customer: true,
        payment: true,
        items: {
          include: { menuItem: true },
        },
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const orderCount = orders.length;

    // Detailed metadata for deeper analysis
    const orderDetails = orders.map(o => ({
      customer: o.customer?.name || "Anonymous",
      total: o.total,
      type: o.type, // DINE_IN, DELIVERY, etc.
      payment: o.payment?.method || "Unspecified", // STRIPE, CASH, etc.
      items: o.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(", ")
    }));

    const itemCounts: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const name = item.menuItem.name;
        itemCounts[name] = (itemCounts[name] || 0) + item.quantity;
      });
    });

    const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
    const topItems = sortedItems.slice(0, 10).map(i => `${i[0]} (${i[1]} units)`).join(", ");

    const systemPrompt = `You are a Senior Strategic Business Consultant for a high-end restaurant group. Your task is to provide an extremely detailed, high-level executive report on daily performance.
    
    KNOWLEDGE BASE:
    - Full Menu Options: [ ${menuContext} ]
    - You have visibility into customer identities, payment preferences (CASH vs CARD), and service types (DINE-IN vs DELIVERY).
    
    INSTRUCTIONS FOR REPORT STRUCTURE:
    1. EXECUTIVE SUMMARY: A high-level view of the day's financial health.
    2. REVENUE ANALYSIS: Deep dive into order values, payment methods, and platform performance.
    3. PRODUCT PERFORMANCE: Analyze what was sold vs what is on the menu. Identify "Star" items and "Underperforming" items.
    4. CUSTOMER INSIGHTS: Mention specific regular customers by name if they ordered. Analyze customer retention.
    5. STRATEGIC RECOMMENDATIONS: Based on the data, suggest 2-3 specific actions the manager should take tomorrow.
    
    TONE & LENGTH:
    - Professional, analytical, and verbose. 
    - DO NOT provide a short summary. Aim for a full, comprehensive report (300-500 words).
    - Use Markdown headers, bold text, and bullet points for readability.`;

    const userPrompt = `DAILY ANALYTICS FOR ${targetDate.toDateString()}:
    - Order Count: ${orderCount}
    - Revenue: $${totalRevenue.toFixed(2)}
    - Top Performance List: ${topItems || "None"}
    
    RAW TRANSACTION LOG:
    ${JSON.stringify(orderDetails.slice(0, 100), null, 2)}
    
    MERCHANT SPECIFIC QUERY/FOCUS: "${instructions || "Perform a full comprehensive business analysis."}"
    
    Generate the full executive report now. Use the provided Menu Knowledge to suggest cross-selling or menu optimizations.`;

    const summary = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
