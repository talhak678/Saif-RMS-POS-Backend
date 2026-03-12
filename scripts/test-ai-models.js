
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

async function listModels() {
  try {
    const envFile = fs.readFileSync('e:\\saif-rms-pos-backend\\.env', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY="([^"]+)"/);
    if (!match) throw new Error("API Key not found in .env");
    
    const API_KEY = match[1];
    
    // Test with fetch directly or a minimalist approach
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("LIST MODELS FAILED:", err.message);
    process.exit(1);
  }
}

listModels();
