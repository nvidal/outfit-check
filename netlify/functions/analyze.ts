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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseClient = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  // Initial lang detection from headers
  let lang = getLang(req);

  if (!supabaseClient) {
    return formatError("storage_config", 500, lang);
  }

  let body: { image?: string; language?: string; occasion?: string } = {};
  try {
    body = await req.json();
    lang = getLang(req, body.language); // Refine lang with body if available
  } catch {
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
    }
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("db_url", 500, lang);
  }

  const dbClient = new Client({ connectionString: dbUrl });
  try {
    // Add timeout to DB connect
    const connectPromise = dbClient.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Connect Timeout")), 5000));
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err) {
    console.error(`[ANALYZE] DB Connection Failed:`, err);
    return formatError("process_fail", 500, lang);
  }

  try {
    // Add timeout to query
    const queryPromise = dbClient.query(
      `SELECT COUNT(*) FROM scans 
       WHERE (ip_address = $1 OR user_id = $2) 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [clientIp, userId]
    );
    const queryTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Query Timeout")), 5000));
    
    // @ts-expect-error - Promise.race types are tricky with query result
    const usageRes = await Promise.race([queryPromise, queryTimeout]);
    
    const count = parseInt(usageRes.rows[0].count);
    const LIMIT = userId ? 150 : 3;

    if (count >= LIMIT) {
      return formatError(userId ? "limit_user" : "limit_guest", 429, lang);
    }

    const image = body.image;
    const language = (body.language ?? "en").slice(0, 2);
    const occasion = body.occasion ?? "general";
    
    // Allow model override for benchmarking, default to 2.5 Flash Image
    const ALLOWED_MODELS = [
      "gemini-2.0-flash-exp", 
      "gemini-2.5-flash", 
      "gemini-3-flash-preview",
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-lite"
    ];
    const selectedModel = (body.model && ALLOWED_MODELS.includes(body.model)) 
      ? body.model 
      : "gemini-2.5-flash-image";

    if (!image) {
      return formatError("no_image", 400, lang);
    }

    const { mimeType, base64 } = parseImagePayload(image);
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > MAX_IMAGE_BYTES) {
      return formatError("image_too_large", 413, lang);
    }

    const folder = userId ? userId : 'guest';
    const fileName = `${folder}/${Date.now()}-${randomUUID()}.${getExtension(mimeType)}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return formatError("api_key", 500, lang);
    }
    const ai = new GoogleGenAI({ apiKey });

    // --- Prepare AI Promise ---
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
1. **Trend Analysis:** Use your internal knowledge for **2025, 2026, and recent trends**. Use Google Search ONLY if you need to verify a specific, niche, or very recent micro-trend. Prioritize speed and internal knowledge.
2. Provide a critique from THREE different perspectives (Personas).

**Personas:**
1. **Editor:** Ruthless fashion editor. Cares about proportions, tailoring, and fabric. Professional, sophisticated tone.
2. **Hypebeast:** Gen Z trend scout. Cares about brands, vibes, and clout. Uses slang ('drip', 'clean', 'fit').
3. **Boho:** Warm, free-spirited stylist. Cares about texture, earth tones, and flow. Supportive, 'bestie' tone.

**Context:**
- Occasion: ${occasion}
- Target Language: ${language.toUpperCase()} (STRICT: All output text MUST be in this language).
- Region: ${regionLabel}

**Response Format:**
{
  "results": [
    {
      "persona": "editor",
      "score": number (1-10),
      "title": "Short punchy title (in ${language})",
      "critique": "CONCISE: Max 2 sentences. Direct and concrete. Focus on what works and what doesn't. (in ${language})",
      "improvement_tip": "One actionable, concrete tip. No fluff. (in ${language})",
      "highlights": [
        { 
          "type": "good"|"bad", 
          "label": "Brief label (in ${language})", 
          "point_2d": [y, x] 
        }
      ]
    },
    { "persona": "hypebeast", ... },
    { "persona": "boho", ... }
  ]
}

**Visual Guidelines:**
- **point_2d**: Return the normalized CENTER point [y, x] of the item.
- Scale: 0.0 - 1.0 (e.g., [0.5, 0.5] is center of image).
- Precision: Point must be ON the item.
`;

    const runAI = async (withTools: boolean): Promise<AIResponse> => {
       const config: {
         model: string;
         generationConfig: { responseMimeType: string; maxOutputTokens: number };
         contents: (string | { inlineData: { data: string; mimeType: string } })[];
         tools?: { googleSearchRetrieval: Record<string, unknown> }[];
       } = {
         model: selectedModel,
         generationConfig: {
           responseMimeType: "application/json",
           maxOutputTokens: 2500,
         },
         contents: [prompt, imagePart],
       };
       if (withTools && selectedModel !== 'gemini-1.5-flash') {
         // 1.5 Flash might not support tools in the same way or we want to test pure speed? 
         // Actually 1.5 Flash supports tools, but let's keep it consistent.
         // If selectedModel is 1.5, we might want to disable tools if that's the intention of "2.5" vs "3.0" (old vs new capabilities).
         // But for now let's assume both can use tools if available.
         // However, googleSearchRetrieval is a specific feature. Let's keep it enabled for both if possible.
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
             .replace("Use Google Search ONLY if you need to verify a specific, niche, or very recent micro-trend. Prioritize speed and internal knowledge.", "Focus on general style principles.");
           
           result = await ai.models.generateContent({
               model: selectedModel,
               generationConfig: {
                 responseMimeType: "application/json",
                 maxOutputTokens: 2500,
               },
               contents: [fallbackPrompt, imagePart],
           }) as unknown as AIResponse;
        }
  
        const responseText = result.text;
        if (!responseText) {
          throw new Error("Empty response from AI");
        }
        
        const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonString);
        
        let results = [];
        if (parsed.results && Array.isArray(parsed.results)) {
           results = parsed.results;
        } else if (Array.isArray(parsed)) {
           results = parsed;
        } else {
           throw new Error("Invalid JSON structure");
        }

        // Normalize points if needed (0-1 -> 0-1000)
        results = results.map((res: Record<string, unknown>) => {
           if (res.highlights && Array.isArray(res.highlights)) {
             res.highlights = res.highlights.map((h: Record<string, unknown>) => {
               if (h.point_2d && Array.isArray(h.point_2d)) {
                 const points = h.point_2d as number[];
                 const isNormalized = points.every((v) => v >= 0 && v <= 1);
                 if (isNormalized) {
                   h.point_2d = points.map((v) => Math.round(v * 1000));
                 }
               }
               return h;
             });
           }
           return res;
        });

        return results;
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