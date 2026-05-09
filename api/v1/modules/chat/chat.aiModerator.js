const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const quickContactCheck = (message = "") => {
  const text = String(message || "").toLowerCase();

  const compactText = text.replace(/[\s\-().]/g, "");

  const phoneRegex = /(?:\+?\d{1,4})?[6-9]\d{9,12}/;
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

  const socialRegex =
    /(whatsapp|telegram|insta|instagram|facebook|fb|gmail|email|mail|call me|dm me|outside|direct deal|direct payment|pay directly|phonepe|gpay|google pay|upi)/i;

  if (phoneRegex.test(compactText)) {
    return {
      blocked: true,
      warning: false,
      riskType: "CONTACT_DETAIL",
      audience: "both",
      message: "Phone number sharing is not allowed on this platform.",
    };
  }

  if (emailRegex.test(text)) {
    return {
      blocked: true,
      warning: false,
      riskType: "CONTACT_DETAIL",
      audience: "both",
      message: "Email sharing is not allowed on this platform.",
    };
  }

  if (socialRegex.test(text)) {
    return null;
  }

  return {
    blocked: false,
    warning: false,
    riskType: "SAFE",
    audience: "none",
    message: "",
  };
};

exports.moderateChatMessage = async ({ message, senderType }) => {
  if (!message || !message.trim()) {
    return {
      blocked: false,
      warning: false,
      riskType: "SAFE",
      audience: "none",
      message: "",
    };
  }

  const quickResult = quickContactCheck(message);

  if (quickResult) return quickResult;

  try {
    const prompt = `
You are a marketplace chat safety moderator.

Detect whether this chat message contains:
- Phone number
- WhatsApp number
- Email
- Social media handle
- Telegram/Instagram/Facebook contact sharing
- UPI/payment details
- Address/contact details
- Request to deal outside platform
- Seller/customer trying to bypass the platform

Return ONLY valid JSON:
{
  "blocked": boolean,
  "warning": boolean,
  "riskType": "CONTACT_DETAIL" | "BYPASS_PLATFORM" | "PAYMENT_OUTSIDE" | "SAFE",
  "audience": "customer" | "seller" | "both" | "none",
  "message": "short warning message"
}

Rules:
- If direct contact detail is shared, blocked=true.
- If outside-platform deal is suggested, blocked=false and warning=true.
- If senderType is seller and bypass is detected, give strict seller warning.
- If senderType is customer and bypass is detected, tell customer platform is not responsible outside.
- Safe normal product discussion should be SAFE.

senderType: ${senderType || "unknown"}
message: "${message.replace(/"/g, '\\"')}"
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const rawText = response.text || "{}";

    const cleanText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanText);

    return {
      blocked: Boolean(parsed.blocked),
      warning: Boolean(parsed.warning),
      riskType: parsed.riskType || "SAFE",
      audience: parsed.audience || "none",
      message: parsed.message || "",
    };
  } catch (error) {
    console.error("Gemini moderation error:", error);

    return {
      blocked: false,
      warning: false,
      riskType: "SAFE",
      audience: "none",
      message: "",
    };
  }
};