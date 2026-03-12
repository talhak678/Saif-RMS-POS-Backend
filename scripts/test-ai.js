
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function testAI() {
  try {
    const envFile = fs.readFileSync('e:\\saif-rms-pos-backend\\.env', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY="([^"]+)"/);
    if (!match) throw new Error("API Key not found in .env");
    
    const API_KEY = match[1];
    const genAI = new GoogleGenerativeAI(API_KEY);
    
    // Testing with gemini-2.0-flash which was listed as available
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    console.log("Testing with gemini-2.0-flash...");
    const result = await model.generateContent("Response correctly if you are working. Just say 'I am working'.");
    const response = await result.response;
    console.log("SUCCESS:", response.text());
    process.exit(0);
  } catch (err) {
    console.error("DEBUG - Full Error:", err.message);
    process.exit(1);
  }
}

testAI();
