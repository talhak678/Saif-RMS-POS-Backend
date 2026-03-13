import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { complaint, customerName, restaurantName, instructions, menuItemName } = await req.json();

    if (!complaint) {
      return NextResponse.json({ error: "Complaint text is required" }, { status: 400 });
    }

    const systemPrompt = `You are a professional Customer Relations Manager for ${restaurantName || "our restaurant"}. 
    Your goal is to draft a reply to a customer review/complaint.
    
    Rules:
    - ABSOLUTE PRIORITY: Follow the "Merchant Instructions" strictly. If the merchant says "be firm" or "offer a 50% discount", do exactly that.
    - If no specific instructions, be empathetic and professional.
    - Personalize the response.
    - Keep it concise (under 120 words).`;

    const userPrompt = `Draft a response for:
    - Customer: ${customerName || "Valued Customer"}
    - Item/Product: ${menuItemName || "their order"}
    - Customer Feedback: "${complaint}"
    - MERCHANT SPECIFIC INSTRUCTIONS: "${instructions || "Be professional and helpful"}"
    
    Task: Write a reply that addresses the feedback while strictly following the MERCHANT SPECIFIC INSTRUCTIONS.`;

    const responseDraft = await generateContent(userPrompt, systemPrompt);
    return NextResponse.json({ response: responseDraft.trim() });
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
