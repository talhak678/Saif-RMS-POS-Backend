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

    // Aggregate Source Breakdown
    const sourceBreakdown = orders.reduce((acc, order) => {
      acc[order.source] = (acc[order.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Detailed metadata for deeper analysis
    const orderDetails = orders.map(o => ({
      orderNo: o.orderNo,
      source: o.source, // POS, WEBSITE, MOBILE
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

    const systemPrompt = `You are a Senior Strategic Business Consultant for a high-end restaurant group. You have COMPLETE access to the restaurant's database for the requested date.
    
    KNOWLEDGE BASE:
    - Full Menu Options: [ ${menuContext} ]
    - Full Transaction History: You can see exactly which channel an order came from (POS, WEBSITE, or MOBILE).
    - Customer Identities: You know who bought what.
    - Payment Methods: You know if they paid by CASH, CARD, or STRIPE.
    
    CRITICAL RULE:
    - NEVER say "I don't know" or "I don't have this information." 
    - If a user asks for POS vs Website counts, use the SOURCE BREAKDOWN provided.
    - If data for a specific customer is asked, search the RAW TRANSACTION LOG.
    - If there is ZERO data for a day, report: "No transactions were recorded on this day."
    
    REPORT STRUCTURE:
    1. EXECUTIVE SUMMARY: High-level financial health.
    2. CHANNEL PERFORMANCE: Exact breakdown of orders from POS, WEBSITE, and MOBILE.
    3. REVENUE & PAYMENTS: Deep dive into order values and payment preferences.
    4. PRODUCT PERFORMANCE: Analyze sales vs full menu catalog.
    5. CUSTOMER INSIGHTS: Specific customer names and their habits.
    6. STRATEGIC RECOMMENDATIONS: Data-driven actions for tomorrow.
    
    TONE & LENGTH:
    - Professional, analytical, and highly detailed (300-500 words).
    - Use Markdown formatting: Headers, bold text, bullet points.`;

    const userPrompt = `DAILY ANALYTICS FOR ${targetDate.toDateString()}:
    - Total Order Count: ${orderCount}
    - Total Revenue: $${totalRevenue.toFixed(2)}
    - SOURCE BREAKDOWN (Where orders came from):
        * POS: ${sourceBreakdown.POS || 0}
        * WEBSITE: ${sourceBreakdown.WEBSITE || 0}
        * MOBILE: ${sourceBreakdown.MOBILE || 0}
    - Top Performance List: ${topItems || "None"}
    
    RAW TRANSACTION LOG (First 100):
    ${JSON.stringify(orderDetails.slice(0, 100), null, 2)}
    
    MERCHANT SPECIFIC QUERY/FOCUS: "${instructions || "Perform a full comprehensive business analysis."}"
    
    Analyze the data and generate the report. Answer any specific questions about POS/Website sources using the data provided.`;

    const summary = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
