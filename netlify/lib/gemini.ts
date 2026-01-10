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
    const generationConfig: { responseMimeType?: string; maxOutputTokens: number } = {
      maxOutputTokens: 2500,
    };

    // gemini-2.5-flash-image does not support strict JSON mode via API param
    if (selectedModel !== "gemini-2.5-flash-image") {
      generationConfig.responseMimeType = "application/json";
    }

    const config: {
      model: string;
      config: { responseMimeType?: string; maxOutputTokens: number };
      contents: (string | { inlineData: { data: string; mimeType: string } })[];
      tools?: { googleSearchRetrieval: Record<string, unknown> }[];
    } = {
      model: selectedModel,
      config: generationConfig,
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
       
    } catch {
       console.warn("Search timed out or failed, falling back to fast generation.");
       // Fallback: Run without search (Fast)
       const fallbackPrompt = prompt
         .replace("Use Google Search ONLY if you need to verify a specific, niche, or very recent micro-trend. Prioritize speed and internal knowledge.", "Focus on general style principles.");
       
       const fallbackConfig: { responseMimeType?: string; maxOutputTokens: number } = {
          maxOutputTokens: 2500,
       };
       if (selectedModel !== "gemini-2.5-flash-image") {
          fallbackConfig.responseMimeType = "application/json";
       }

       result = await ai.models.generateContent({
           model: selectedModel,
           config: fallbackConfig,
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

interface RecommendOptions {
  apiKey: string;
  imageBase64: string;
  mimeType: string;
  language: string;
  userRequest: string;
}

interface Part {
  text?: string;
  inlineData?: {
    data: string;
    mimeType: string;
  };
}

interface Candidate {
  content?: {
    parts?: Part[];
  };
}

interface GenerateContentResponse {
  candidates?: Candidate[];
}

export const recommendOutfit = async ({ apiKey, imageBase64, mimeType, language, userRequest }: RecommendOptions) => {
  const ai = new GoogleGenAI({ apiKey });
  // Use 'gemini-2.5-flash-image' for single-request multimodal generation (Text + Image)
  const model = "gemini-2.5-flash-image";

  const prompt = `
**Role:** Expert Personal Stylist.
**Task:** 
1. **Analyze User:** Identify the user's key physical traits from the photo:
   - Hair (Style, Color, Texture)
   - Skin Tone
   - Body Type / Build
   - Gender / Approx Age
2. **Select Outfit:** Recommend a COMPLETE outfit based on the request: "${userRequest}".
3. **Generate Image:** Generate a photorealistic fashion image of a person **who matches the user's physical traits exactly** wearing this recommended outfit.
   - **Likeness:** The person in the generated image MUST have the same hair, skin tone, and body build as the user in the photo.
   - **Safety Override:** The image MUST be Safe For Work. Use a standard, neutral fashion pose. If the original photo has risky elements (exposure, ambiguous pose), **ignore them** and use a professional fashion catalog style.

**Output Language:** ${language} (Ensure all values are in ${language}).

**Constraints:**
- **VERY CONCISE**.
- **Max 1 sentence** per reasoning.
- **Bullet points** for items.
- No fluff.

**Response Format:**
You must provide the text response in **JSON** format, followed by the generated image.
JSON Structure:
{
  "user_analysis": "Max 10 words description of user features.",
  "outfit_name": "Short, catchy name",
  "items": ["Item 1", "Item 2", "Item 3"],
  "reasoning": "Max 1 sentence explaining the choice.",
  "dos": ["Do 1", "Do 2"],
  "donts": ["Don't 1", "Don't 2"],
  "visual_prompt": "Hyper-detailed photorealistic prompt. You MUST describe the person's EXACT hair (texture/length/color), skin tone, and build from the photo to ensure a lookalike. Example: 'A photorealistic shot of a person with wavy chestnut hair, olive skin, and athletic build wearing...'"
}
`;

  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  try {
    // ... inside recommendOutfit ...
    const generate = async (currentPrompt: string) => {
      const config = {
        model,
        contents: [currentPrompt, imagePart],
      };
      return await ai.models.generateContent(config) as unknown as GenerateContentResponse;
    };

    let result = await generate(prompt);
    let candidate = result.candidates?.[0];

    // Helper to extract parts
    const extractParts = (cand: Candidate | undefined) => {
       let text = "";
       let img = null;
       let mime = null;
       if (cand?.content?.parts) {
         for (const part of cand.content.parts) {
           if (part.text) text += part.text;
           if (part.inlineData) {
             img = part.inlineData.data;
             mime = part.inlineData.mimeType;
           }
         }
       }
       return { text, img, mime };
    };

    let { text: responseText, img: generatedImageBase64, mime: generatedImageMimeType } = extractParts(candidate);

    // Parse JSON helper to reuse
    const parseJSON = (txt: string) => {
      try {
        const jsonString = txt.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(jsonString);
      } catch {
        const match = txt.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
      }
    };

    let parsed = parseJSON(responseText);

    // RETRY LOGIC: If image is missing, try again
    if (!generatedImageBase64) {
       console.warn("First attempt missing image, retrying with focused prompt...");
       
       let retryPrompt = "";
       if (parsed?.visual_prompt) {
          // If we have the description, ask ONLY for the image to avoid "laziness"
          retryPrompt = `**TASK:** Generate the image described below. DO NOT return any text, ONLY the generated image file.
          
**IMAGE DESCRIPTION:** ${parsed.visual_prompt}`;
       } else {
          retryPrompt = `**CRITICAL:** Generate BOTH the JSON analysis AND the outfit image.\n${prompt}`;
       }

       result = await generate(retryPrompt);
       candidate = result.candidates?.[0];
       const retryParts = extractParts(candidate);
       
       generatedImageBase64 = retryParts.img;
       generatedImageMimeType = retryParts.mime;
       
       // If retry produced JSON but the first one didn't, update it
       if (!parsed && retryParts.text) {
          parsed = parseJSON(retryParts.text);
       }
    }

    if (!parsed) throw new Error("Failed to parse JSON response");

    // Attach Generated Image
    if (generatedImageBase64 && generatedImageMimeType) {
      parsed.image = `data:${generatedImageMimeType};base64,${generatedImageBase64}`;
    }

    return parsed;


    return parsed;

  } catch (err) {
    console.error("Recommendation Failed", err);
    throw err;
  }
};
