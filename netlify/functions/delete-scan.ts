import { createClient } from "@supabase/supabase-js";
import { Client } from "@neondatabase/serverless";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "outfits";

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
    return formatError("Missing storage configuration", 500);
  }

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return formatError("Invalid JSON", 400);
  }

  const scanId = body.id;
  if (!scanId) {
    return formatError("No scan ID provided", 400);
  }

  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return formatError("Unauthorized", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (!user || authError) {
    return formatError("Unauthorized", 401);
  }
  userId = user.id;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return formatError("Missing DATABASE_URL", 500);
  }

  const dbClient = new Client({ connectionString: dbUrl });
  await dbClient.connect();

  try {
    // 1. Fetch the scan to get image_url and verify ownership
    const res = await dbClient.query(
      "SELECT image_url, user_id FROM scans WHERE id = $1",
      [scanId]
    );

    if (res.rows.length === 0) {
      return formatError("Scan not found", 404);
    }

    const scan = res.rows[0];
    if (scan.user_id !== userId) {
      return formatError("Unauthorized to delete this scan", 403);
    }

    // 2. Extract path from public URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/outfits/[path]
    const imageUrl = scan.image_url;
    const pathPart = `/public/${SUPABASE_BUCKET}/`;
    const index = imageUrl.indexOf(pathPart);
    if (index === -1) {
      console.warn("Could not extract storage path from URL:", imageUrl);
    } else {
      const storagePath = imageUrl.substring(index + pathPart.length);
      
      // 3. Delete from Supabase Storage
      const { error: deleteStorageError } = await supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .remove([storagePath]);

      if (deleteStorageError) {
        console.error("Error deleting from storage:", deleteStorageError);
        // We continue anyway to delete the DB record
      }
    }

    // 4. Delete from Database
    await dbClient.query("DELETE FROM scans WHERE id = $1", [scanId]);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting scan:", error);
    return formatError("Failed to delete scan", 500);
  } finally {
    await dbClient.end();
  }
}
