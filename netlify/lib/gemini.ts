import { GoogleGenAI } from "@google/genai";

interface AnalyzeOptions {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
  language: string;
  occasion: string;
  model?: string;
}

interface AIResponse {
  text: string;
}

// Allow model override for benchmarking, default to 2.5 Flash Image
const ALLOWED_MODELS = [
  "gemini-2.0-flash-exp", 
  "gemini-2.5-flash", 
  "gemini-3-flash-preview",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-lite"
];

export const analyzeWithGemini = async ({ apiKey, imageBase64, mimeType, language, occasion, model }: AnalyzeOptions) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const selectedModel = (model && ALLOWED_MODELS.includes(model)) 
      ? model 
      : "gemini-2.5-flash-image";

  const regionLabel = language === 'es'
      ? 'Uruguay/Argentina (use local slang like "che", "re", "copado" if appropriate for the persona)'
      : 'Global';

  const prompt = `
**Role:**
You are an expert Personal Stylist AI.
Current Year: 2026.

**Task:**
Analyze the attached outfit image.
1. **Trend Analysis:** Use your internal knowledge for **2025, 2026, and recent trends**. Use Google Search ONLY if you need to verify a specific, niche, or very recent micro-trend. Prioritize speed and internal knowledge.
2. Provide a critique from THREE different perspectives (Personas).

**Personas:**
1. **Editor:** Ruthless fashion editor. Cares about proportions, tailoring, and fabric. Professional, sophisticated tone.
2. **Hypebeast:** Gen Z trend scout. Cares about brands, vibes, and clout. Uses slang ('drip', 'clean', 'fit').
3. **Boho:** Warm, free-spirited stylist. Cares about texture, earth tones, and flow. Supportive, 'bestie' tone.

**Context:**
- Occasion: ${occasion}
- Target Language: ${language.toUpperCase()} (STRICT: All output text MUST be in this language).
- Region: ${regionLabel}

**Response Format:**
{
  "results": [
    {
      "persona": "editor",
      "score": number (1-10),
      "title": "Short punchy title (in ${language})",
      "critique": "CONCISE: Max 2 sentences. Direct and concrete. Focus on what works and what doesn't. (in ${language})",
      "improvement_tip": "One actionable, concrete tip. No fluff. (in ${language})",
      "highlights": [
        // Provide at least 3 distinct highlights (mix of good/bad)
        { 
          "type": "good"|"bad", 
          "label": "Brief label (in ${language})", 
          "point_2d": [y, x] 
        }
      ]
    },
    { "persona": "hypebeast", ... },
    { "persona": "boho", ... }
  ]
}

**Visual Guidelines:**
- **point_2d**: Return the normalized CENTER point [y, x] of the item.
- Scale: 0.0 - 1.0 (e.g., [0.5, 0.5] is center of image).
- Precision: Point must be ON the item.
`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const runAI = async (withTools: boolean): Promise<AIResponse> => {
    const config: {
      model: string;
      config: { responseMimeType: string; maxOutputTokens: number };
      contents: (string | { inlineData: { data: string; mimeType: string } })[];
      tools?: { googleSearchRetrieval: Record<string, unknown> }[];
    } = {
      model: selectedModel,
      config: {
        responseMimeType: "application/json",
        maxOutputTokens: 2500,
      },
      contents: [prompt, imagePart],
    };
    if (withTools && selectedModel !== 'gemini-1.5-flash') {
      config.tools = [{ googleSearchRetrieval: {} }];
    }
    return ai.models.generateContent(config) as unknown as Promise<AIResponse>;
 };

 try {
    let result: AIResponse;
    try {
       // Race: 15s timeout vs AI with Search
       const timeoutPromise = new Promise<never>((_, reject) => 
           setTimeout(() => reject(new Error("Timeout")), 15000)
       );
       
       result = await Promise.race([runAI(true), timeoutPromise]);
       
       if (!result.text) throw new Error("No text from tool");
       
    } catch (e) {
       console.warn("Search timed out or failed, falling back to fast generation.", e instanceof Error ? e.message : e);
       // Fallback: Run without search (Fast)
       const fallbackPrompt = prompt
         .replace("Use Google Search ONLY if you need to verify a specific, niche, or very recent micro-trend. Prioritize speed and internal knowledge.", "Focus on general style principles.");
       
       result = await ai.models.generateContent({
           model: selectedModel,
           config: {
             responseMimeType: "application/json",
             maxOutputTokens: 2500,
           },
           contents: [fallbackPrompt, imagePart],
       }) as unknown as AIResponse;
    }

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    
    let results = [];
    if (parsed.results && Array.isArray(parsed.results)) {
       results = parsed.results;
    } else if (Array.isArray(parsed)) {
       results = parsed;
    } else {
       throw new Error("Invalid JSON structure");
    }

    // Normalize points if needed (0-1 -> 0-1000)
    results = results.map((res: Record<string, unknown>) => {
       if (res.highlights && Array.isArray(res.highlights)) {
         res.highlights = res.highlights.map((h: Record<string, unknown>) => {
           if (h.point_2d && Array.isArray(h.point_2d)) {
             const points = h.point_2d as number[];
             const isNormalized = points.every((v) => v >= 0 && v <= 1);
             if (isNormalized) {
               h.point_2d = points.map((v) => Math.round(v * 1000));
             }
           }
           return h;
         });
       }
       return res;
    });

    return results;
  } catch (err) {
    console.error("AI Analysis Failed", err);
    throw err;
  }
};
