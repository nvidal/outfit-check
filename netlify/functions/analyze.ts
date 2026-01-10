import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";
import { getLang, formatError } from "../lib/i18n";
import { parseImagePayload, getExtension } from "../lib/image";
import { analyzeWithGemini } from "../lib/gemini";
import { uploadImage } from "../lib/storage";
import { extractClientIp } from "../lib/request";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ANALYZE_USER_LIMIT = 20;
const ANALYZE_GUEST_LIMIT = 3;

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

  let lang = getLang(req);

  if (!supabaseClient) {
    return formatError("storage_config", 500, lang);
  }

  let body: { image?: string; language?: string; occasion?: string; model?: string } = {};
  try {
    body = await req.json();
    lang = getLang(req, body.language);
  } catch {
    return formatError("invalid_json", 400, lang);
  }

  let userId: string | null = null;
  let userName: string | null = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (user && !authError) {
      userId = user.id;
      userName = user.email || null;
    }
  }

  const clientIp = extractClientIp(req);
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("db_url", 500, lang);
  }

  const dbClient = new Client({ connectionString: dbUrl });
  try {
    const connectPromise = dbClient.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("DB Connect Timeout")), 5000));
    await Promise.race([connectPromise, timeoutPromise]);
  } catch (err) {
    console.error(`[ANALYZE] DB Connection Failed:`, err);
    return formatError("process_fail", 500, lang);
  }

  try {
    const queryPromise = dbClient.query(
      `SELECT COUNT(*) FROM scans 
       WHERE (ip_address = $1 OR user_id = $2) 
       AND created_at > NOW() - INTERVAL '24 hours'`,
      [clientIp, userId]
    );
    const queryTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Query Timeout")), 5000));
    
    const usageRes = await Promise.race([queryPromise, queryTimeout]) as { rows: { count: string }[] };
    
    const count = parseInt(usageRes.rows[0].count);
    const LIMIT = userId ? ANALYZE_USER_LIMIT : ANALYZE_GUEST_LIMIT;

    if (count >= LIMIT) {
      return formatError(userId ? "limit_user" : "limit_guest", 429, lang);
    }

    const image = body.image;
    const language = (body.language ?? "en").slice(0, 2);
    const occasion = body.occasion ?? "general";
    
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

    // --- Execute Logic in Parallel (where possible) ---
    // Actually, we can't do parallel upload and AI easily if we want to save AI cost on upload fail,
    // but typically we want both.
    // The previous implementation did parallel. We will keep it.

    const aiPromise = analyzeWithGemini({
        apiKey,
        imageBase64: base64,
        mimeType,
        language,
        occasion,
        model: body.model
    });

    const uploadPromise = uploadImage(fileName, buffer, mimeType);

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
    // Handle specific errors from sub-services if needed, or catch-all
    return formatError("process_fail", 500, lang);
  } finally {
    await dbClient.end();
  }
}