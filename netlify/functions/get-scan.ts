import { Client } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    return formatError("Missing Supabase configuration", 500);
  }

  let body: { id?: string };

  try {
    body = await req.json();
  } catch {
    return formatError("Invalid JSON", 400);
  }

  const { id } = body;

  if (!id) {
    return formatError("Missing scan ID", 400);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return formatError("Unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (!user || error) {
    return formatError("Unauthorized", 401);
  }

  const userId = user.id;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("Missing DATABASE_URL", 500);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    // Try Scan
      let result = await client.query(
        `SELECT id, 'scan' as type, image_url, ai_results as data, created_at, occasion, user_name
         FROM scans 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
    );

    if (result.rows.length === 0) {
      // Try Style
      result = await client.query(
        `SELECT id, 'style' as type, image_url, generated_image_url, result as data, created_at
         FROM styles 
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    }

    if (result.rows.length === 0) {
      return formatError("Scan not found", 404);
    }

    return new Response(JSON.stringify(result.rows[0]), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching scan:", error);
    return formatError("Failed to fetch scan", 500);
  } finally {
    await client.end();
  }
}
