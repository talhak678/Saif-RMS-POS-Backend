import { NextRequest, NextResponse } from "next/server";
import { generateContent } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rating, feedback, menuItemName, instructions } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "Rating is required" }, { status: 400 });
    }

    const systemPrompt = `You are a neutral professional content generator. Your task is to write a restaurant review based on provided parameters.
    
    Rules:
    - If the user provides "Instructions" or "Hints", they take ABSOLUTE priority over the star rating or existing feedback.
    - If hints say the food was bad, write a negative review even if the stars are high.
    - If hints say the service was slow, mention that.
    - Do NOT be overly enthusiastic unless the parameters clearly indicate a great experience.
    - Style: Natural, first-person restaurant review style. 
    - Length: 2-4 sentences.
    - NO placeholders.`;

    const userPrompt = `Create a review with these details:
    - Stars: ${rating}/5
    - Item: ${menuItemName || "the food"}
    - Sentiment Hint/Instructions: "${instructions || "No specific instructions"}"
    - Original Context: "${feedback && feedback !== "Everything was great!" ? feedback : "No existing feedback"}"
    
    Task: Write the review based on the Hint/Instructions. If the hint contradicts the star rating, the HINT is the truth.`;

    const generatedReview = await generateContent(userPrompt, systemPrompt);
    return NextResponse.json({ review: generatedReview.trim() });
  } catch (error) {
    console.error("AI Review Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate review" }, { status: 500 });
  }
}
