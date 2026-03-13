import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Common AI utility to interact with Gemini
 * @param prompt - The full text prompt for the model
 * @param systemInstruction - Optional system context/instructions
 * @param long - If true, allows extra long responses (for reports)
 */
export async function generateContent(prompt: string, systemInstruction?: string, long = false) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
      generationConfig: {
        maxOutputTokens: long ? 8192 : 2048,
        temperature: 0.7,
      }
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content from AI.");
  }
}
