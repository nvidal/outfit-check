import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";
import { getLang, formatError } from "../lib/i18n";
import { parseImagePayload, getExtension } from "../lib/image";
import { recommendOutfit } from "../lib/gemini";
import { uploadImage } from "../lib/storage";
import { extractClientIp } from "../lib/request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const STYLE_USER_LIMIT = 20;
const STYLE_GUEST_LIMIT = 3;

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

  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (user && !authError) {
      userId = user.id;
    }
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("db_url", 500, lang);
  }
  const dbClient = new Client({ connectionString: dbUrl });
  const clientIp = extractClientIp(req);

  try {
    await dbClient.connect();

    const usageRes = await dbClient.query(
      `SELECT COUNT(*) FROM styles 
       WHERE (ip_address = $1 OR user_id = $2)
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [clientIp, userId]
    );
    const recentCount = parseInt(usageRes.rows[0].count, 10);
    const limit = userId ? STYLE_USER_LIMIT : STYLE_GUEST_LIMIT;
    if (recentCount >= limit) {
      return formatError(userId ? "limit_user" : "limit_guest", 429, lang);
    }

    // 1. Run AI Analysis & Generation
    const { mimeType, base64 } = parseImagePayload(image);
    const byteLength = Buffer.from(base64, "base64").length;
    if (byteLength > MAX_IMAGE_BYTES) {
      return formatError("image_too_large", 413, lang);
    }
    
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
           const sanitizedResult = { ...aiResult, image: publicUrl };
           
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
              JSON.stringify(sanitizedResult),
              clientIp
            ]
          );
          const insertedId = dbRes.rows[0].id;

          return new Response(JSON.stringify({ ...sanitizedResult, id: insertedId }), {
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
