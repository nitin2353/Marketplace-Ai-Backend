const axios = require('axios');

function cleanJSON(text) {
    try {
        // remove ```json and ```
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleaned);
    } catch (err) {
        console.error("JSON CLEAN ERROR:", err);
        return null;
    }
}

exports.parseRequirement = async (userInput) => {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [
                    {
                        parts: [
                            {
                                text: `Extract structured data from this:
"${userInput}"

Return ONLY JSON (no backticks, no explanation):
{
  "product_type": "",
  "budget": number,
  "description": ""
}`
                            }
                        ]
                    }
                ]
            }
        );

        const rawText = response.data.candidates[0].content.parts[0].text;

        const parsed = cleanJSON(rawText);

        if (!parsed) {
            throw new Error("Failed to parse AI response");
        }

        return parsed;

    } catch (error) {
        console.error("AI ERROR:", error.response?.data || error.message);
        throw error;
    }
};