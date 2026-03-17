import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Common AI utility to interact with Gemini Pro
 * @param prompt - The full text prompt for the model
 * @param systemInstruction - Optional system context/instructions
 */
export async function generateContent(prompt: string, systemInstruction?: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate content from AI.");
  }
}
