import { Client } from "@neondatabase/serverless";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

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
    // Try Scan
      let result = await client.query(
        `SELECT id, 'scan' as type, image_url, ai_results as data, created_at, occasion, user_name
         FROM scans 
         WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
      // Try Style
      result = await client.query(
        `SELECT id, 'style' as type, image_url, generated_image_url, result as data, created_at
         FROM styles 
         WHERE id = $1`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return formatError("Scan not found", 404);
    }

    return new Response(JSON.stringify(result.rows[0]), {
      headers: { 
        ...CORS_HEADERS, 
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=3600, max-age=3600"
      },
    });
  } catch (error) {
    console.error("Error fetching scan:", error);
    return formatError("Failed to fetch scan", 500);
  } finally {
    await client.end();
  }
}
