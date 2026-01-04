import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";
import { GoogleGenAI } from "@google/genai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "outfits";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseClient = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  : null;

const formatError = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

const parseImagePayload = (input: string) => {
  const match = input.match(/^data:(image\/[a-zA-Z+\-.]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: "image/jpeg", base64: input };
};

const getExtension = (mimeType: string) => {
  const parts = mimeType.split("/");
  if (parts.length === 2) {
    return parts[1].split("+")[0];
  }
  return "jpg";
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  if (!supabaseClient) {
    return formatError("Missing storage configuration", 500);
  }

  let body: { image?: string; language?: string; occasion?: string; user_id?: string; user_name?: string };

  try {
    body = await req.json();
  } catch {
    return formatError("Invalid JSON", 400);
  }

  const image = body.image;
  const language = body.language ?? "en";
  const occasion = body.occasion ?? "general";
  const userId = body.user_id ?? null;
  const userName = body.user_name ?? null;

  if (!image) {
    return formatError("No image provided", 400);
  }

  const { mimeType, base64 } = parseImagePayload(image);
  const buffer = Buffer.from(base64, "base64");

  if (buffer.length > MAX_IMAGE_BYTES) {
    return formatError("Image exceeds 6 MB limit", 413);
  }

  const fileName = `${Date.now()}-${randomUUID()}.${getExtension(mimeType)}`;

  try {
    const { error: uploadError } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, buffer, { contentType: mimeType });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicData } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    if (!publicData?.publicUrl) {
      throw new Error("Failed to get image url");
    }

    const imageUrl = publicData.publicUrl;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return formatError("Missing API Key", 500);
    }

    const ai = new GoogleGenAI({ apiKey });

    type PersonaMode = 'editor' | 'hypebeast' | 'boho';
    const personaConfigs: Array<{ id: PersonaMode; instruction: string }> = [
      {
        id: 'editor',
        instruction: `You are a ruthless fashion editor (La Directora). You care about proportions, tailoring, and fabric quality. Use professional terminology like 'silhouette', 'color palette', 'textural contrast', and 'composition'. Your tone is professional and sophisticated.`,
      },
      {
        id: 'hypebeast',
        instruction: `You are a Gen Z trend scout (El Cool). You care about silhouette, brand relevance, and 'vibes'. Use slang like 'fit', 'flex', 'drip', 'grail', 'clean'. Focus on brand synergy and street credibility.`,
      },
      {
        id: 'boho',
        instruction: `You are a warm, free-spirited stylist (Amiga Boho). You love textures, layers, and earth tones. Talk like a supportive but honest best friend. Use emojis and be very encouraging but direct about what's not working.`,
      },
    ];

    const regionLabel = language === 'es'
      ? 'Uruguay/Argentina (use local slang like "che", "re", "copado" if appropriate for the persona)'
      : 'Global';

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType,
      },
    };

    const personaResults = await Promise.all(personaConfigs.map(async (persona) => {
      const prompt = `
**Role:**
You are an expert Personal Stylist AI.
Current Year: 2026.
Trend Knowledge: High (Aware of Gorpcore, Y2K, Old Money, etc).

**The Persona You Must Act As:**
${persona.instruction}

**The Context:**
- Occasion: ${occasion}
- Target Language: ${language}
- Region: ${regionLabel}

**Task:**
Analyze the attached image of the outfit.
1. Identify the key items and their placement.
2. Evaluate based on your Persona's specific priorities.
3. Provide a numeric score (1-10).
4. Identify 3-5 specific "highlights" (points of interest). Each highlight must be either "good" (green) or "bad" (red).
5. For each highlight, provide normalized coordinates [ymin, xmin, ymax, xmax] (0-1000) that bound the specific item or area.

**Response Format:**
Return raw JSON only. Do not use Markdown code blocks.
{
  "score": number,
  "title": "Short punchy title (max 6 words)",
  "critique": "2-3 sentences analyzing the fit, color, and vibe.",
  "improvement_tip": "One concrete, actionable step to fix the outfit.",
  "highlights": [
    {
      "type": "good" | "bad",
      "label": "Short description (e.g. 'Perfect tailoring', 'Clashing colors')",
      "box_2d": [ymin, xmin, ymax, xmax]
    }
  ]
}
`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [prompt, imagePart],
      });
      const responseText = result.text;
      if (!responseText) {
        throw new Error("Empty response from AI");
      }
      const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(jsonString);

      return {
        persona: persona.id,
        ...data,
      };
    }));

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return formatError("Missing DATABASE_URL", 500);
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query(
        "INSERT INTO scans (image_url, language, occasion, user_id, user_name, ai_results) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          imageUrl,
          language,
          occasion,
          userId,
          userName,
          JSON.stringify(personaResults),
        ],
      );
    } finally {
      await client.end();
    }

    return new Response(JSON.stringify(personaResults), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("error processing outfit", error);
    if (error instanceof Error && error.message.includes("Failed to get")) {
      return formatError("Storage upload failed", 502);
    }
    return formatError("Failed to process outfit", 500);
  }
}
