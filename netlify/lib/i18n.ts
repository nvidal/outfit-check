interface TranslationStrings {
  storage_config: string;
  invalid_json: string;
  no_image: string;
  image_too_large: string;
  limit_user: string;
  limit_guest: string;
  api_key: string;
  ai_empty: string;
  db_url: string;
  storage_fail: string;
  process_fail: string;
}

export const TRANSLATIONS: Record<string, TranslationStrings> = {
  en: {
    storage_config: "Missing storage configuration",
    invalid_json: "Invalid JSON",
    no_image: "No image provided",
    image_too_large: "Image exceeds 6 MB limit",
    limit_user: "Daily limit reached. Try again tomorrow.",
    limit_guest: "Guest limit reached. Please sign up to continue!",
    api_key: "Missing API Key",
    ai_empty: "Empty response from AI",
    db_url: "Missing DATABASE_URL",
    storage_fail: "Storage upload failed",
    process_fail: "Failed to process outfit",
  },
  es: {
    storage_config: "Configuración de almacenamiento faltante",
    invalid_json: "JSON inválido",
    no_image: "No se proporcionó ninguna imagen",
    image_too_large: "La imagen excede el límite de 6 MB",
    limit_user: "Límite diario alcanzado. Intenta de nuevo mañana.",
    limit_guest: "¡Límite de invitado alcanzado! Regístrate para continuar.",
    api_key: "Falta la clave de API",
    ai_empty: "Respuesta vacía de la IA",
    db_url: "Falta DATABASE_URL",
    storage_fail: "Error al subir al almacenamiento",
    process_fail: "Error al procesar el outfit",
  }
};

export const getLang = (req: Request, bodyLang?: string) => {
  if (bodyLang && TRANSLATIONS[bodyLang.slice(0, 2)]) return bodyLang.slice(0, 2);
  const acceptLang = req.headers.get("accept-language");
  if (acceptLang && acceptLang.startsWith("es")) return "es";
  return "en";
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const formatError = (key: string, status: number, lang: string) => {
  const message = TRANSLATIONS[lang][key] || TRANSLATIONS["en"][key] || key;
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
};
