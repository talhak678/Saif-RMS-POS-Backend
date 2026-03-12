import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rating, feedback, menuItemName } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const systemPrompt = `You are a creative content writer for a restaurant's marketing team. Your goal is to transform a customer's simple rating and brief feedback into a natural, engaging, and high-quality review for the website.
    
    Guidelines:
    - High ratings (4-5): Write an enthusiastic and warm review highlighting the positive experience.
    - Medium ratings (3): Write a polite and honest review that notes both the good parts and areas for improvement.
    - Low ratings (1-2): Write a professional, constructive review that voices concerns without being rude.
    - Style: Natural sounding, like a real customer wrote it. 
    - Length: 2-4 sentences.
    - NO placeholders like [Name] or [Restaurant]. Treat the provided context as the absolute source.`;

    const userPrompt = `Help me write a review based on these details:
    - Customer Rating: ${rating} / 5 Stars
    - Dish/Item: ${menuItemName || "the food"}
    - Feedback: "${feedback || "Everything was great!"}"
    
    Write the review in a natural, first-person style (e.g., "I really enjoyed...").`;

    const generatedReview = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ review: generatedReview.trim() });
  } catch (error) {
    console.error("AI Review Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
