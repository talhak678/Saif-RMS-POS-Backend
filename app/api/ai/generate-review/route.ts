import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rating, feedback, menuItemName, instructions } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const systemPrompt = `You are a creative content writer for a restaurant's marketing team. Your goal is to transform a customer's simple rating and brief feedback into a natural, engaging, and high-quality review for the website.
    
    Guidelines:
    - High ratings (4-5): Usually enthusiastic, but ALWAYS follow user instructions if they contradict the rating.
    - Medium ratings (3): Polite and honest.
    - Low ratings (1-2): Professional and constructive.
    - Style: Natural sounding, like a real customer wrote it. 
    - Length: 2-4 sentences.
    - NO placeholders like [Name] or [Restaurant]. Treat the provided context as the absolute source.
    - PRIORITY: If user provided specific instructions/hints, prioritize them above everything else.`;

    const userPrompt = `Help me write a review based on these details:
    - Customer Rating: ${rating} / 5 Stars
    - Dish/Item: ${menuItemName || "the food"}
    - Feedback: "${feedback || "Everything was great!"}"
    - USER SPECIFIC INSTRUCTIONS/HINT: "${instructions || "None"}"
    
    Write the review in a natural, first-person style (e.g., "I really enjoyed..."). Ensure you strictly follow the USER SPECIFIC INSTRUCTIONS if provided.`;

    const generatedReview = await generateContent(userPrompt, systemPrompt);

    return NextResponse.json({ review: generatedReview.trim() });
  } catch (error) {
    console.error("AI Review Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
