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
        `WITH scan_history AS (
         SELECT 
           id,
           'scan'::text AS type,
           image_url,
           created_at,
           occasion::text AS occasion,
           NULL::text AS generated_image_url,
           COALESCE(
             (
                  SELECT jsonb_agg(
                    jsonb_build_object(
                   'persona', elem->>'persona',
                   'score', (elem->>'score')::numeric,
                   'title', elem->>'title'
                 )
               )
                  FROM jsonb_array_elements(COALESCE(ai_results, '[]'::jsonb)) AS elem
             ),
                '[]'::jsonb
           ) AS data
         FROM scans
         WHERE user_id = $1
       ),
       style_history AS (
         SELECT 
           id,
           'style'::text AS type,
           image_url,
           created_at,
           NULL::text AS occasion,
           generated_image_url,
            jsonb_build_object(
             'outfit_name', result->>'outfit_name'
           ) AS data
         FROM styles
         WHERE user_id = $1
       ),
       combined AS (
         SELECT * FROM scan_history
         UNION ALL
         SELECT * FROM style_history
       )
       SELECT * FROM combined
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return new Response(JSON.stringify(result.rows), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return formatError("Failed to fetch history", 500);
  } finally {
    await client.end();
  }
}