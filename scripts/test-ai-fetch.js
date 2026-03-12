
const fs = require('fs');

async function testAI() {
  try {
    const envFile = fs.readFileSync('e:\\saif-rms-pos-backend\\.env', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY="([^"]+)"/);
    if (!match) throw new Error("API Key not found in .env");
    
    const API_KEY = match[1];
    
    console.log("Testing with direct fetch to gemini-2.5-flash...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Say 'I am working'." }]
        }]
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("HTTP ERROR:", response.status, response.statusText);
      console.error("ERROR DETAILS:", JSON.stringify(data, null, 2));
      process.exit(1);
    }
    
    console.log("SUCCESS:", data.candidates[0].content.parts[0].text);
    process.exit(0);
  } catch (err) {
    console.error("DEBUG - Full Error:", err.message);
    process.exit(1);
  }
}

testAI();
