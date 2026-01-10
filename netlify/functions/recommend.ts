import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";
import { getLang, formatError } from "../lib/i18n";
import { parseImagePayload, getExtension } from "../lib/image";
import { recommendOutfit } from "../lib/gemini";
import { uploadImage } from "../lib/storage";

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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseClient = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
    : null;

  let lang = getLang(req);

  if (!supabaseClient) {
    return formatError("storage_config", 500, lang);
  }

  let body: { image?: string; language?: string; text?: string } = {};
  try {
    body = await req.json();
    lang = getLang(req, body.language);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: CORS_HEADERS });
  }

  const { image, text } = body;

  if (!image || !text) {
    return new Response(JSON.stringify({ error: "Missing image or text" }), { status: 400, headers: CORS_HEADERS });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return formatError("api_key", 500, lang);
  }

  // Auth Check
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    if (user && !error) {
      userId = user.id;
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("db_url", 500, lang);
  }
  const dbClient = new Client({ connectionString: dbUrl });
  const clientIp = req.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";

  try {
    await dbClient.connect();

    // 1. Run AI Analysis & Generation
    const { mimeType, base64 } = parseImagePayload(image);
    
    const aiResult = await recommendOutfit({
      apiKey,
      imageBase64: base64,
      mimeType,
      language: lang,
      userRequest: text,
    });

    // 2. Process Result & Persistence
    // Only save if we have a generated image, as that's the core value of "Style Me" history
    if (aiResult.image && aiResult.image.startsWith('data:')) {
       try {
         const { mimeType: genMime, base64: genBase64 } = parseImagePayload(aiResult.image);
         const genBuffer = Buffer.from(genBase64, "base64");
         const folder = userId ? userId : 'guest';
         const genFileName = `${folder}/style-${Date.now()}-${randomUUID()}.${getExtension(genMime)}`;
         
         const publicUrl = await uploadImage(genFileName, genBuffer, genMime);
         
         // 3. Save to DB
         // We use the generated image URL for both fields since we are skipping the input upload
         const dbRes = await dbClient.query(
          `INSERT INTO styles (user_id, image_url, generated_image_url, request_text, language, result, ip_address) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            userId,
            publicUrl, // Use generated image as the main "image_url" for history display
            publicUrl,
            text,
            lang,
            JSON.stringify(aiResult),
            clientIp
          ]
        );
        const insertedId = dbRes.rows[0].id;

        return new Response(JSON.stringify({ ...aiResult, id: insertedId }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
       } catch (err) {
         console.warn("Failed to upload/save style result", err);
         // We still return the result to the user even if saving failed
       }
    }

    return new Response(JSON.stringify(aiResult), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Recommend error:", error);
    return formatError("process_fail", 500, lang);
  } finally {
    await dbClient.end();
  }
}
