const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
async function generate(prompt) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        return JSON.parse(text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
    } catch (error) {
        console.error("AI service failure:", error);
        throw new Error("AI service failed to respond.");
    }
}
module.exports = { generate };