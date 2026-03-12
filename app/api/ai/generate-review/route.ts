import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rating, feedback, menuItemName } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const systemPrompt = `You are a helpful assistant for a restaurant. Your job is to help customers write a polite, descriptive, and helpful review based on their rating and short feedback. 
    If the rating is high (4-5 stars), the review should be enthusiastic. 
    If the rating is medium (3 stars), the review should be balanced. 
    If the rating is low (1-2 stars), the review should be polite but express dissatisfaction constructively.
    Keep the review concise (2-3 sentences). Do not use placeholders like [Insert Name].`;

    const userPrompt = `Generate a review for a restaurant order.
    Rating: ${rating} stars.
    Item ordered: ${menuItemName || "N/A"}.
    Short customer feedback: ${feedback || "No feedback provided, just the rating."}
    
    Please provide a polished version of this review.`;

    const generatedReview = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ review: generatedReview.trim() });
  } catch (error) {
    console.error("AI Review Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
