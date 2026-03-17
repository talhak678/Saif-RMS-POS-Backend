import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import prisma from "@/lib/prisma";
import { startOfDay, endOfDay, format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { restaurantId, instructions, clientDate } = await req.json();

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    // Use client date as today's reference if provided, otherwise server time
    const today = clientDate ? new Date(clientDate) : new Date();
    let targetDate = today;

    // If instructions are provided, prioritize extraction from instructions
    if (instructions) {
      try {
        const extractionPrompt = `Extract the specific date the user is asking about from this message: "${instructions}". 
        Today's date is ${today.toDateString()} (YYYY-MM-DD: ${format(today, 'yyyy-MM-dd')}).
        If the user mentions "yesterday", use ${format(new Date(today.getTime() - 86400000), 'yyyy-MM-dd')}.
        If the user mentions "last week", use the start of last week.
        If the user mentions a specific day of the week, use the most recent occurrence of that day relative to today.
        Respond with ONLY the date in YYYY-MM-DD format. 
        If no specific date is mentioned or it's ambiguous, respond with "${format(today, 'yyyy-MM-dd')}".`;
        
        const extractedDateStr = await generateContent(extractionPrompt, "You are a precise date extraction tool for a restaurant POS system.");
        const cleanDateStr = extractedDateStr.trim().match(/\d{4}-\d{2}-\d{2}/)?.[0];
        
        if (cleanDateStr) {
          const parsedDate = new Date(cleanDateStr);
          if (!isNaN(parsedDate.getTime())) {
            targetDate = parsedDate;
          }
        }
      } catch (e) {
        console.error("Failed to extract date from instructions:", e);
      }
    }

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

    // Breakdown by type (Dine-in, Delivery, etc)
    const typeBreakdown = orders.reduce((acc, order) => {
      acc[order.type] = (acc[order.type] || 0) + 1;
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
    const topItems = sortedItems.slice(0, 5).map(i => `**${i[0]}** (${i[1]} sold)`).join(", ");

    const systemPrompt = `You are "Saif AI", a premium restaurant business consultant and data analyst.
    Your goal is to provide a "Best Report Summary" that is professional, insightful, and easy to read.
    
    Guidelines:
    1. Use Markdown for formatting (titles, bold text, bullet points).
    2. Start with a high-level executive summary of the day's performance.
    3. Use sections like "💰 Revenue Highlights", "📦 Operational Overview", and "🔥 Popular Choices".
    4. If the user asked a specific question, answer it first and prominent.
    5. Provide actionable insights (e.g., if delivery is high, suggest optimizing delivery flow).
    6. Tone should be sophisticated, encouraging, and data-driven.
    7. If no orders are found, suggest ways to improve engagement for that date.`;

    const userPrompt = `Generate a Comprehensive Performance Report for ${targetDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

    RAW DATA SNAPSHOT:
    - Total Orders: ${orderCount}
    - Total Revenue Gross: $${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    - Source Mix: ${Object.entries(sourceBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ') || "No data"}
    - Type Mix: ${Object.entries(typeBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ') || "No data"}
    - Top 5 Best Sellers: ${topItems || "None recorded"}

    USER'S MESSAGE/INQUIRY: "${instructions || "Please give me a complete summary of this day's performance."}"

    Please provide the "Best Report Summary" based on this data.`;

    const summary = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ 
      summary: summary.trim(), 
      date: targetDate.toISOString().split('T')[0] 
    });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
