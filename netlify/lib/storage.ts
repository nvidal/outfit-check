import { createClient } from "@supabase/supabase-js";

const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? "outfits";

export const uploadImage = async (fileName: string, buffer: Buffer, mimeType: string) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
      throw new Error("storage_config");
  }

  const supabaseClient = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  console.log(`[STORAGE] Starting upload...`);
  const uploadTimeout = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error("Storage Timeout")), 20000)
  );

  const performUpload = async () => {
    const { error: uploadError } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, buffer, { contentType: mimeType });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData } = await supabaseClient.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    if (!publicData?.publicUrl) throw new Error("Failed to get image url");
    
    console.log(`[STORAGE] Upload success: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  };

  return Promise.race([performUpload(), uploadTimeout]);
};
