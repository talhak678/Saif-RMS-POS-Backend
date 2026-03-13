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

    // 1. Fetch the full Menu Catalog with descriptions for context
    const menuItems = await prisma.menuItem.findMany({
      where: { category: { restaurantId } },
      include: { category: true }
    });

    const menuContext = menuItems.map(m => `${m.name} (${m.category.name}): "${m.description || "N/A"}" - $${m.price}`).join(" | ");

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

    // 3. Fetch Reviews for this period to give AI "quality" context
    const reviews = await prisma.review.findMany({
      where: {
        order: { branch: { restaurantId } },
        createdAt: { gte: start, lte: end },
      },
      include: { menuItem: true }
    });

    const reviewSummary = reviews.map(r => `[Item: ${r.menuItem?.name || "General"}] ${r.rating} Stars - "${r.comment}"`).join(" | ");

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

    const avgOrderValue = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : "0.00";

    // Unsold items: menu items not in itemCounts
    const unsoldItems = menuItems
      .filter(m => !itemCounts[m.name])
      .map(m => m.name)
      .join(", ") || "None";

    const systemPrompt = `You are "RMS-AI", a dedicated restaurant business intelligence advisor embedded inside a Restaurant Management System. You are writing an exclusive internal report for the restaurant owner/admin.

You have FULL ACCESS to the following restaurant data for the day:
- The COMPLETE menu (every item, category, description, and price).
- Every single order that was placed today (source, customer, items, payment method).
- Customer reviews and star ratings for the day.
- Exact breakdown of WHERE orders came from: POS (staff-created) vs WEBSITE (online customers) vs MOBILE.

YOUR MISSION: Write a detailed, expert-level, 80-100 line restaurant performance report in Markdown format. This is NOT a summary — it is a business audit. You will NOT write vague statements. Every claim must be backed by the numbers you are given.

REPORT SECTIONS (MANDATORY — you MUST include ALL of them):

# 📊 Daily Performance Report — [Date]

## 1. Executive Overview
   - Revenue vs expected. Is this a good day or not? Be direct.

## 2. ⚡ Channel Performance (POS vs Website vs Mobile)
   - Exact orders from POS: [use the exact number provided]
   - Exact orders from WEBSITE: [use the exact number provided]
   - Exact orders from MOBILE: [use the exact number provided]
   - Which channel is dominant? What does it mean for the business?
   - Actionable: How can the weaker channel be improved?

## 3. 💰 Revenue & Payment Analysis
   - Total revenue, average order value, highest & lowest order.
   - Payment method preference (CASH vs CARD vs STRIPE).
   - Revenue per channel comparison.

## 4. 🏆 Top Performing Items
   - List every item that was sold today with unit counts.
   - Rate them: STAR (high sales) / STEADY (moderate) / SLOW.
   - Cross-reference with their menu price — which items are generating the most revenue?

## 5. 📉 Menu Gaps (Items NOT Sold Today)
   - List items from the full menu that had ZERO orders today.
   - Suggest 2-3 actionable reasons why (price too high? not popular? needs promotion?).
   - Recommendation: Should these items be promoted, discounted, or removed?

## 6. 👥 Customer Insights
   - Name the top customers (if data available). Who spent the most?
   - Patterns: Are most orders Dine-In or Delivery?
   - Repeat customer analysis — are we seeing loyalty?

## 7. ⭐ Quality & Reviews
   - Summarize what customers said in their reviews today.
   - Highlight any high-rated or low-rated items and why it matters.
   - Action: If ratings are low for a core item, flag it as a RISK.

## 8. 🎯 Strategic Recommendations
   - Give 5 specific, numbered actions the manager should take TOMORROW.
   - Each recommendation must reference data from the report.
   - E.g., "POS orders are higher — train staff to upsell desserts when taking POS orders."

RULES:
- NEVER say "data not available" — if a number is 0, say 0.
- NEVER skip a section.
- Use **bold** for all key numbers and item names.
- Be specific, not generic. No filler text.
- Minimum 80 lines of content.`;

    const userPrompt = `=== RESTAURANT INTELLIGENCE BRIEFING ===
DATE: ${targetDate.toDateString()}

--- FINANCIAL METRICS ---
Total Delivered Orders: ${orderCount}
Total Revenue: $${totalRevenue.toFixed(2)}
Average Order Value: $${avgOrderValue}

--- CHANNEL BREAKDOWN (EXACT — DO NOT SAY "NOT AVAILABLE") ---
POS (Staff/Counter): ${sourceBreakdown.POS || 0} orders
WEBSITE (Online): ${sourceBreakdown.WEBSITE || 0} orders
MOBILE APP: ${sourceBreakdown.MOBILE || 0} orders

--- ITEMS SOLD TODAY (ranked by units) ---
${topItems || "No items sold today."}

--- ITEMS NOT SOLD TODAY (from full menu) ---
${unsoldItems}

--- FULL MENU CATALOG (for context and gap analysis) ---
${menuContext}

--- TRANSACTION-LEVEL LOG ---
${JSON.stringify(orderDetails.slice(0, 100), null, 2)}

--- CUSTOMER FEEDBACK & REVIEWS ---
${reviewSummary || "No customer reviews were submitted today."}

--- MANAGER'S SPECIFIC QUESTION/FOCUS ---
"${instructions || "Full comprehensive audit. Identify growth opportunities, risks, and tomorrow's action plan."}"

=== END OF DATA ===

Now write the full report following the mandatory section structure. Be specific, analytical, and use the EXACT numbers above. Do not skip any section. The report must be at least 80 lines long.`;

    const summary = await generateContent(userPrompt, systemPrompt, true);

    return NextResponse.json({ summary: summary.trim() });
  } catch (error) {
    console.error("AI Summary Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate sales summary" }, { status: 500 });
  }
}
