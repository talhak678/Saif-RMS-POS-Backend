import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { complaint, customerName, restaurantName } = await req.json();

    if (!complaint) {
      return NextResponse.json({ error: "Complaint text is required" }, { status: 400 });
    }

    const systemPrompt = `You are a highly skilled Customer Relations Manager for ${restaurantName || "our restaurant"}. 
    Your mission is to turn dissatisfied customers into loyal ones by providing exceptionally empathetic, professional, and solution-oriented responses.
    
    Response Structure:
    1. Sincere Apology: Acknowledge the specific issue mentioned.
    2. Empathy: Show that you understand why they are upset.
    3. Resolution: Propose a specific next step (e.g., a refund, a discount on the next order, or a direct call from the manager).
    4. Sign-off: End with a professional closing.
    
    Guidelines:
    - Keep it under 150 words.
    - Personalize the response using the customer's name.
    - DO NOT use placeholders like [Insert Link] or [Insert Phone].`;

    const userPrompt = `Draft a response to this complaint:
    - Customer Name: ${customerName || "Valued Customer"}
    - Complaint Details: "${complaint}"
    
    Provide a draft that feels personal and solves the customer's problem.`;

    const responseDraft = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ response: responseDraft.trim() });
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
