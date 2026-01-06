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

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("Missing DATABASE_URL", 500);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  try {
    const result = await client.query(
      `SELECT id, image_url, ai_results, created_at, occasion, user_name
       FROM scans 
       WHERE id = $1`,
      [id]
    );

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
