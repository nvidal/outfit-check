import { Client } from "@neondatabase/serverless";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

  let body: { user_id?: string; limit?: number; offset?: number };

  try {
    body = await req.json();
  } catch {
    return formatError("Invalid JSON", 400);
  }

  const userId = body.user_id;
  const limit = body.limit || 10;
  const offset = body.offset || 0;

  if (!userId) {
    return formatError("Missing user_id", 400);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("Missing DATABASE_URL", 500);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const result = await client.query(
      `SELECT id, image_url, ai_results, created_at, occasion 
       FROM scans 
       WHERE user_id = $1 
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
