import { getLang, formatError } from "../lib/i18n";
import { parseImagePayload } from "../lib/image";
import { recommendOutfit } from "../lib/gemini";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  let body: { image?: string; language?: string; text?: string } = {};
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS_HEADERS });
  }

  const lang = getLang(req, body.language);
  const { image, text } = body;

  if (!image || !text) {
    // Reusing standard error or sending custom
    return new Response(JSON.stringify({ error: "Missing image or text" }), { status: 400, headers: CORS_HEADERS });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return formatError("api_key", 500, lang);
  }

  try {
    const { mimeType, base64 } = parseImagePayload(image);

    const result = await recommendOutfit({
      apiKey,
      imageBase64: base64,
      mimeType,
      language: lang,
      userRequest: text,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recommend error:", error);
    return formatError("process_fail", 500, lang);
  }
}
