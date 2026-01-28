import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3-flash-preview"; 

export const analyzeWithGemini = async ({ apiKey, imageBase64, mimeType, language, occasion }: any) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Role: Expert Stylist. Analyze outfit for: ${occasion}.
Return a JSON object with a "results" array containing exactly 3 personas (editor, hypebeast, boho).
Each persona must have: score (1-10), title, critique (max 2 sentences), improvement_tip, 3 highlights (point_2d: [y, x] 0-1000).
Language: ${language.toUpperCase()}.
No Google Search. Be extremely concise.
`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      config: { responseMimeType: "application/json", maxOutputTokens: 2000 },
      contents: [prompt, { inlineData: { data: imageBase64, mimeType } }],
    }) as any;

    const responseText = result.text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(responseText);
    
    // Robust parsing for different AI output formats
    if (data.results && Array.isArray(data.results)) return data.results;
    if (Array.isArray(data)) return data;
    if (data.editor || data.hypebeast) return Object.values(data); // In case it returns an object of personas
    
    throw new Error("Invalid format");
  } catch (err) {
    console.error("AI Analysis Failed", err);
    throw err;
  }
};

export const recommendOutfit = async ({ apiKey, imageBase64, mimeType, language, userRequest }: any) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Style Me: ${userRequest}. Lang: ${language}. Return JSON: user_analysis, outfit_name, items, reasoning, dos, donts, visual_prompt (EN photoreal).`;

  try {
    const textRes = await ai.models.generateContent({
      model: MODEL,
      contents: [prompt, { inlineData: { data: imageBase64, mimeType } }],
      config: { responseMimeType: "application/json" }
    }) as any;

    const parsed = JSON.parse(textRes.text.replace(/```json/g, "").replace(/```/g, "").trim());

    if (parsed.visual_prompt) {
       try {
         const imageRes = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: [`Photoreal fashion shot: ${parsed.visual_prompt}`, { inlineData: { data: imageBase64, mimeType } }],
         }) as any;
         const data = imageRes.candidates?.[0]?.content?.parts?.[0]?.inlineData;
         if (data) parsed.image = `data:${data.mimeType};base64,${data.data}`;
       } catch (e) {}
    }
    return parsed;
  } catch (err) { throw err; }
};