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
    // Helper to delete file from storage given a public URL
    const deleteFromStorage = async (publicUrl: string) => {
      const pathPart = `/public/${SUPABASE_BUCKET}/`;
      const index = publicUrl.indexOf(pathPart);
      if (index === -1) {
        console.warn("Could not extract storage path from URL:", publicUrl);
        return;
      }
      const storagePath = publicUrl.substring(index + pathPart.length);
      const { error } = await supabaseClient.storage
        .from(SUPABASE_BUCKET)
        .remove([storagePath]);
      
      if (error) console.error("Error deleting from storage:", error);
    };

    // 1. Try Scans table
    const scanRes = await dbClient.query(
      "SELECT image_url, user_id FROM scans WHERE id = $1",
      [scanId]
    );

    if (scanRes.rows.length > 0) {
      const scan = scanRes.rows[0];
      if (scan.user_id !== userId) return formatError("Unauthorized", 403);

      await deleteFromStorage(scan.image_url);
      await dbClient.query("DELETE FROM scans WHERE id = $1", [scanId]);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Try Styles table
    const styleRes = await dbClient.query(
      "SELECT image_url, generated_image_url, user_id FROM styles WHERE id = $1",
      [scanId]
    );

    if (styleRes.rows.length > 0) {
      const style = styleRes.rows[0];
      if (style.user_id !== userId) return formatError("Unauthorized", 403);

      if (style.image_url) await deleteFromStorage(style.image_url);
      if (style.generated_image_url) await deleteFromStorage(style.generated_image_url);
      
      await dbClient.query("DELETE FROM styles WHERE id = $1", [scanId]);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return formatError("Item not found", 404);
  } catch (error) {
    console.error("Error deleting scan:", error);
    return formatError("Failed to delete scan", 500);
  } finally {
    await dbClient.end();
  }
}
