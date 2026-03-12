import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { complaint, customerName, restaurantName } = await req.json();

    if (!complaint) {
      return NextResponse.json({ error: "Complaint text is required" }, { status: 400 });
    }

    const systemPrompt = `You are a polite and professional customer service manager for a restaurant named ${restaurantName || "Our Restaurant"}. 
    Your goal is to draft a sincere apology and a constructive resolution to customer complaints. 
    Use a tone that is empathetic, professional, and helpful. 
    Do not use placeholders like [Insert Name]. If a customer name is provided, address them by first name.`;

    const userPrompt = `Generate a response to this customer complaint:
    Customer: ${customerName || "Customer"}
    Complaint: "${complaint}"
    
    Please provide a polished response that includes an apology, acknowledgment of the issue, and a promise to resolve it.`;

    const responseDraft = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ response: responseDraft.trim() });
  } catch (error) {
    console.error("AI Response Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
  }
}
