import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { messages, restaurantId } = await req.json();

    if (!restaurantId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Restaurant ID and messages are required" }, { status: 400 });
    }

    // Fetch restaurant details for system prompt
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        branches: true,
        menuItems: { include: { category: true } }
      }
    });

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const menuSummary = restaurant.menuItems.slice(0, 50).map(item => `- ${item.name} ($${item.price.toFixed(2)}) [${item.category.name}]`).join("\n");
    const branchInfo = restaurant.branches.map(b => `- ${b.name}: ${b.address} (${b.timing || "Contact for hours"})`).join("\n");

    const systemPrompt = `You are a friendly AI chatbot for a restaurant named ${restaurant.name}. 
    Your goal is to answer customer queries about the menu, opening hours (timings), and delivery details.
    
    Restaurant Background:
    - Name: ${restaurant.name}
    - Description: ${restaurant.description || "A delicious place to eat."}
    - Branches & Hours:
    ${branchInfo}
    
    Menu (Top items):
    ${menuSummary}
    
    Rules:
    1. Be polite, helpful, and concise. 
    2. If you don't know the answer, ask the customer to contact support. 
    3. Encourage ordering from the website.
    4. Keep responses focused on the restaurant. 
    5. Don't mention you're an AI unless asked. `;

    const lastMessage = messages[messages.length - 1].content;
    const conversationHistory = messages.slice(0, -1).map(m => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.content}`).join("\n");
    
    const userPrompt = `Conversation History:
    ${conversationHistory}
    
    Current Question: ${lastMessage}
    
    Please provide a helpful response.`;

    const chatResponse = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ reply: chatResponse.trim() });
  } catch (error) {
    console.error("AI Chatbot Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
