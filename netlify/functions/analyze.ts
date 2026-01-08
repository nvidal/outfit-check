import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";
import { GoogleGenAI } from "@google/genai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "outfits";

interface TranslationStrings {
  storage_config: string;
  invalid_json: string;
  no_image: string;
  image_too_large: string;
  limit_user: string;
  limit_guest: string;
  api_key: string;
  ai_empty: string;
  db_url: string;
  storage_fail: string;
  process_fail: string;
}

const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    storage_config: "Missing storage configuration",
    invalid_json: "Invalid JSON",
    no_image: "No image provided",
    image_too_large: "Image exceeds 6 MB limit",
    limit_user: "Daily limit reached. Try again tomorrow.",
    limit_guest: "Guest limit reached. Please sign up to continue!",
    api_key: "Missing API Key",
    ai_empty: "Empty response from AI",
    db_url: "Missing DATABASE_URL",
    storage_fail: "Storage upload failed",
    process_fail: "Failed to process outfit",
  },
  es: {
    storage_config: "Configuración de almacenamiento faltante",
    invalid_json: "JSON inválido",
    no_image: "No se proporcionó ninguna imagen",
    image_too_large: "La imagen excede el límite de 6 MB",
    limit_user: "Límite diario alcanzado. Intenta de nuevo mañana.",
    limit_guest: "¡Límite de invitado alcanzado! Regístrate para continuar.",
    api_key: "Falta la clave de API",
    ai_empty: "Respuesta vacía de la IA",
    db_url: "Falta DATABASE_URL",
    storage_fail: "Error al subir al almacenamiento",
    process_fail: "Error al procesar el outfit",
  }
};

const getLang = (req: Request, bodyLang?: string) => {
  if (bodyLang && TRANSLATIONS[bodyLang.slice(0, 2)]) return bodyLang.slice(0, 2);
  const acceptLang = req.headers.get("accept-language");
  if (acceptLang && acceptLang.startsWith("es")) return "es";
  return "en";
};

const formatError = (key: string, status: number, lang: string) => {
  const message = TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key] || key;
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};

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

interface AIResponse {
  text: string;
}

export default async function handler(req: Request) {
  console.log(`[ANALYZE] Request received.`);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }
  console.log(`[ANALYZE] Method check passed.`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log(`[ANALYZE] Init Supabase...`);
  const supabaseClient = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;
  console.log(`[ANALYZE] Supabase inited.`);

  // Initial lang detection from headers
  let lang = getLang(req);
  console.log(`[ANALYZE] Lang detected: ${lang}`);

  if (!supabaseClient) {
    return formatError("storage_config", 500, lang);
  }

  let body: { image?: string; language?: string; occasion?: string } = {};
  try {
    console.log(`[ANALYZE] Parsing JSON...`);
    body = await req.json();
    console.log(`[ANALYZE] JSON parsed.`);
    lang = getLang(req, body.language); // Refine lang with body if available
  } catch {
    console.log(`[ANALYZE] JSON parse failed.`);
    return formatError("invalid_json", 400, lang);
  }

  let userId: string | null = null;
  let userName: string | null = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (user && !error) {
      userId = user.id;
      userName = user.email || null;
      console.log(`[AUTH] User: ${userId}`);
    }
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("db_url", 500, lang);
  }

  const dbClient = new Client({ connectionString: dbUrl });
  try {
    console.log(`[ANALYZE] Connecting to DB...`);
    // Add timeout to DB connect
    const connectPromise = dbClient.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Connect Timeout")), 5000));
    await Promise.race([connectPromise, timeoutPromise]);
    console.log(`[ANALYZE] DB Connected.`);
  } catch (err) {
    console.error(`[ANALYZE] DB Connection Failed:`, err);
    return formatError("process_fail", 500, lang);
  }

  try {
    console.log(`[ANALYZE] Querying usage...`);
    // Add timeout to query
    const queryPromise = dbClient.query(
      `SELECT COUNT(*) FROM scans 
       WHERE (ip_address = $1 OR user_id = $2) 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [clientIp, userId]
    );
    const queryTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Query Timeout")), 5000));
    
    // @ts-ignore
    const usageRes = await Promise.race([queryPromise, queryTimeout]);
    console.log(`[ANALYZE] Usage query done.`);
    
    const count = parseInt(usageRes.rows[0].count);
    const LIMIT = userId ? 50 : 3;
    console.log(`[ANALYZE] Count: ${count}`);

    if (count >= LIMIT) {
       console.log(`[ANALYZE] Limit reached (ignoring for debug if commented out)`); 
      // await dbClient.end();
      // return formatError(userId ? "limit_user" : "limit_guest", 429, lang);
    }

    const image = body.image;
    const language = (body.language ?? "en").slice(0, 2);
    const occasion = body.occasion ?? "general";

    if (!image) {
      await dbClient.end();
      return formatError("no_image", 400, lang);
    }

    console.log(`[ANALYZE] Parsing image...`);
    const { mimeType, base64 } = parseImagePayload(image);
    const buffer = Buffer.from(base64, "base64");
    console.log(`[ANALYZE] Image parsed.`);

    if (buffer.length > MAX_IMAGE_BYTES) {
      await dbClient.end();
      return formatError("image_too_large", 413, lang);
    }

    const folder = userId ? userId : 'guest';
    const fileName = `${folder}/${Date.now()}-${randomUUID()}.${getExtension(mimeType)}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await dbClient.end();
      return formatError("api_key", 500, lang);
    }
    const ai = new GoogleGenAI({ apiKey });

    // --- Prepare AI Promise ---
    console.log(`[ANALYZE] Starting Parallel Execution...`);
    const regionLabel = language === 'es'
      ? 'Uruguay/Argentina (use local slang like "che", "re", "copado" if appropriate for the persona)'
      : 'Global';

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType,
      },
    };

    const prompt = `
**Role:**
You are an expert Personal Stylist AI.
Current Year: 2026.

**Task:**
Analyze the attached outfit image.
1. **CRITICAL:** Use Google Search to identify specific 2026 trends (Runway, TikTok, Pinterest) relevant to this look.
2. Provide a critique from THREE different perspectives (Personas).

**Personas:**
1. **Editor:** Ruthless fashion editor. Cares about proportions, tailoring, and fabric. Professional, sophisticated tone.
2. **Hypebeast:** Gen Z trend scout. Cares about brands, vibes, and clout. Uses slang ('drip', 'clean', 'fit').
3. **Boho:** Warm, free-spirited stylist. Cares about texture, earth tones, and flow. Supportive, 'bestie' tone.

**Context:**
- Occasion: ${occasion}
- Target Language: ${language}
- Region: ${regionLabel}

**Response Format:**
Return raw JSON only.
{
  "results": [
    {
      "persona": "editor",
      "score": number (1-10),
      "title": "Short punchy title",
      "critique": "3-4 sentences. Detailed. MUST weave in the specific 2026 trend context found via search.",
      "improvement_tip": "Actionable advice.",
      "highlights": [
        { "type": "good"|"bad", "label": "...", "box_2d": [ymin, xmin, ymax, xmax] (scale 0-1000) }
      ]
    },
    { "persona": "hypebeast", ... },
    { "persona": "boho", ... }
  ]
}
`;

    const runAI = async (withTools: boolean): Promise<AIResponse> => {
       const config: {
         model: string;
         contents: (string | { inlineData: { data: string; mimeType: string } })[];
         tools?: { googleSearchRetrieval: Record<string, unknown> }[];
       } = {
         model: "gemini-2.0-flash-exp",
         contents: [prompt, imagePart],
       };
       if (withTools) {
         config.tools = [{ googleSearchRetrieval: {} }];
       }
       return ai.models.generateContent(config) as unknown as Promise<AIResponse>;
    };

    const aiPromise = (async () => {
      try {
        let result: AIResponse;
        try {
           // Race: 15s timeout vs AI with Search
           const timeoutPromise = new Promise<never>((_, reject) => 
               setTimeout(() => reject(new Error("Timeout")), 15000)
           );
           
           result = await Promise.race([runAI(true), timeoutPromise]);
           
           if (!result.text) throw new Error("No text from tool");
           
        } catch (e) {
           console.warn("Search timed out or failed, falling back to fast generation.", e instanceof Error ? e.message : e);
           // Fallback: Run without search (Fast)
           const fallbackPrompt = prompt
             .replace("**CRITICAL:** Use Google Search to identify specific 2026 trends (Runway, TikTok, Pinterest) relevant to this look.", "Evaluate the outfit based on general fashion knowledge.")
             .replace("MUST weave in the specific 2026 trend context found via search.", "Focus on general style principles.");
           
           result = await ai.models.generateContent({
               model: "gemini-2.0-flash-exp",
               contents: [fallbackPrompt, imagePart],
           }) as unknown as AIResponse;
        }
  
        const responseText = result.text;
        if (!responseText) {
          throw new Error("Empty response from AI");
        }
        
        const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonString);
        
        if (parsed.results && Array.isArray(parsed.results)) {
           return parsed.results;
        } else if (Array.isArray(parsed)) {
           return parsed;
        } else {
           throw new Error("Invalid JSON structure");
        }
      } catch (err) {
        console.error("AI Analysis Failed", err);
        throw err;
      }
    })();

    // --- Prepare Storage Promise ---
    const uploadPromise = (async () => {
      console.log(`[STORAGE] Starting upload...`);
      const uploadTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Storage Timeout")), 20000)
      );

      const performUpload = async () => {
        const { error: uploadError } = await supabaseClient.storage
          .from(SUPABASE_BUCKET)
          .upload(fileName, buffer, { contentType: mimeType });

        if (uploadError) throw new Error(uploadError.message);

        const { data: publicData } = await supabaseClient.storage
          .from(SUPABASE_BUCKET)
          .getPublicUrl(fileName);

        if (!publicData?.publicUrl) throw new Error("Failed to get image url");
        
        console.log(`[STORAGE] Upload success: ${publicData.publicUrl}`);
        return publicData.publicUrl;
      };

      return Promise.race([performUpload(), uploadTimeout]);
    })();

    // --- Await Both ---
    const [personaResults, imageUrl] = await Promise.all([aiPromise, uploadPromise]);

    const dbRes = await dbClient.query(
      "INSERT INTO scans (image_url, language, occasion, user_id, user_name, ai_results, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [
        imageUrl,
        language,
        occasion,
        userId,
        userName,
        JSON.stringify(personaResults),
        clientIp
      ],
    );
    const insertedId = dbRes.rows[0].id;
    
    return new Response(JSON.stringify({ id: insertedId, results: personaResults }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("error processing outfit", error);
    if (error instanceof Error && error.message.includes("Failed to get")) {
      return formatError("storage_fail", 502, lang);
    }
    return formatError("process_fail", 500, lang);
  } finally {
    await dbClient.end();
  }
}