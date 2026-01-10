import { Client } from "@neondatabase/serverless";
import { createClient } from "@supabase/supabase-js";

interface DBRow {
  id: string;
  type: 'scan' | 'style';
  image_url: string;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any; // ai_results or result JSON
  occasion: string | null;
  generated_image_url: string | null;
}

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

  let body: { limit?: number; offset?: number };

  try {
    body = await req.json();
  } catch {
    return formatError("Invalid JSON", 400);
  }

  let userId: string | null = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (user && !error) {
      userId = user.id;
    }
  }

  if (!userId) {
    return formatError("Unauthorized", 401);
  }

  const limit = body.limit || 10;
  const offset = body.offset || 0;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("Missing DATABASE_URL", 500);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const result = await client.query(
      `SELECT id, 'scan' as type, image_url, created_at, ai_results as data, occasion, NULL as generated_image_url
       FROM scans 
       WHERE user_id = $1
       UNION ALL
       SELECT id, 'style' as type, image_url, created_at, result as data, NULL as occasion, generated_image_url
       FROM styles
       WHERE user_id = $1
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const rows = result.rows.map((row: DBRow) => {
      // Simplify data payload for list view to reduce bandwidth
      let simplifiedData = row.data;

      if (row.type === 'scan' && Array.isArray(row.data)) {
        simplifiedData = row.data.map((r: { persona: string; score: number; title: string }) => ({
          persona: r.persona,
          score: r.score,
          title: r.title
        }));
      } else if (row.type === 'style' && row.data) {
        simplifiedData = {
          outfit_name: row.data.outfit_name
        };
      }

      return { ...row, data: simplifiedData };
    });

    return new Response(JSON.stringify(rows), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return formatError("Failed to fetch history", 500);
  } finally {
    await client.end();
  }
}