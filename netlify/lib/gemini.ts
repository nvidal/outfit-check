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

// Optimized models for speed and efficiency
const ALLOWED_MODELS = [
  "gemini-2.0-flash-exp", 
  "gemini-2.5-flash", 
  "gemini-3-flash-preview",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-lite"
];

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

export const analyzeWithGemini = async ({ apiKey, imageBase64, mimeType, language, occasion, model }: AnalyzeOptions) => {
  const ai = new GoogleGenAI({ apiKey });
  
  // Use Lite model by default for lightning fast text/json extraction
  const selectedModel = (model && ALLOWED_MODELS.includes(model)) 
      ? model 
      : DEFAULT_MODEL;

  const regionLabel = language === 'es'
      ? 'Uruguay/Argentina (use local slang like "che", "re", "copado" if appropriate for the fashion persona)'
      : 'Global';

  const prompt = `
**Role:**
Expert Personal Stylist AI (Year: 2026).

**Task:**
Analyze the attached outfit image and provide a critique from THREE different perspectives (Personas).

**Personas:**
1. **Editor:** Ruthless fashion editor. Professional, sophisticated tone. Focus: proportions, tailoring, fabric.
2. **Hypebeast:** Gen Z trend scout. Focused on brands, vibes, 'drip', and brand synergy.
3. **Boho:** Warm, free-spirited stylist. Supportive 'bestie' tone. Focus: texture, earth tones, flow.

**Context:**
- Occasion: ${occasion}
- Target Language: ${language.toUpperCase()} (STRICT: All output MUST be in this language).
- Region: ${regionLabel}

**Response Format (Strict JSON):**
{
  "results": [
    {
      "persona": "editor",
      "score": number (1-10),
      "title": "Short punchy title",
      "critique": "CONCISE: Max 2 sentences. Focus on what works and what doesn't.",
      "improvement_tip": "One actionable, concrete tip.",
      "highlights": [
        { 
          "type": "good"|"bad", 
          "label": "Brief label", 
          "point_2d": [y, x] 
        }
      ]
    },
    { "persona": "hypebeast", ... },
    { "persona": "boho", ... }
  ]
}

**Visual Guidelines:**
- **point_2d**: Normalized CENTER point [y, x] (0-1000). 
- Ensure points are accurately placed on the relevant clothing items.
`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  try {
    const generationConfig = {
      maxOutputTokens: 1500,
      responseMimeType: "application/json"
    };

    // Execute fast generation without Google Search (speed optimization)
    const result = await ai.models.generateContent({
      model: selectedModel,
      config: generationConfig,
      contents: [prompt, imagePart],
    }) as unknown as AIResponse;

    const responseText = result.text;
    if (!responseText) {
      throw new Error("Empty response from AI");
    }
    
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    
    let results = parsed.results || (Array.isArray(parsed) ? parsed : null);
    if (!results) throw new Error("Invalid JSON structure");

    // Normalize points if model returns 0.0-1.0
    return results.map((res: any) => {
       if (res.highlights && Array.isArray(res.highlights)) {
         res.highlights = res.highlights.map((h: any) => {
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
  } catch (err) {
    console.error("AI Analysis Failed", err);
    throw err;
  }
};

// ... keep recommendOutfit implementation but optimized if needed ...
export const recommendOutfit = async ({ apiKey, imageBase64, mimeType, language, userRequest }: any) => {
  // Keeping the original structure but using faster models/timeouts
  const ai = new GoogleGenAI({ apiKey });
  const textModel = "gemini-3-flash-preview";

  const textPrompt = `**Role:** Expert Personal Stylist.
**Task:** Analyze user traits and recommend a COMPLETE outfit for: "${userRequest}".
**Response Format (JSON):**
{
  "user_analysis": "Max 10 words.",
  "outfit_name": "Catchy name",
  "items": ["Item 1", "Item 2"],
  "reasoning": "Max 1 sentence.",
  "dos": ["Do"], "donts": ["Don't"],
  "visual_prompt": "Photorealistic prompt in ENGLISH for the new outfit."
}`;

  const imagePart = { inlineData: { data: imageBase64, mimeType } };

  try {
    const textRes = await ai.models.generateContent({
      model: textModel,
      contents: [textPrompt, imagePart],
      config: { responseMimeType: "application/json" }
    }) as unknown as any;

    const responseText = textRes.text;
    const parsed = JSON.parse(responseText.replace(/```json/g, "").replace(/```/g, "").trim());

    if (parsed.visual_prompt) {
       const imageModel = "gemini-2.5-flash-image";
       const imagePrompt = `Generate a photorealistic fashion image. REPLACE original clothes with: ${parsed.visual_prompt}`;
       
       try {
         const imageRes = await ai.models.generateContent({
            model: imageModel,
            contents: [imagePrompt, imagePart],
         }) as unknown as any;

         if (imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const data = imageRes.candidates[0].content.parts[0].inlineData;
            parsed.image = `data:${data.mimeType};base64,${data.data}`;
         }
       } catch (imgErr) { console.warn("Image step failed", imgErr); }
    }
    return parsed;
  } catch (err) {
    console.error("Recommendation Failed", err);
    throw err;
  }
};