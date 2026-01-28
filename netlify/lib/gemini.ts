import { GoogleGenAI } from "@google/genai";

const MODEL = "gemini-3-flash-preview"; 

export const analyzeWithGemini = async ({ apiKey, imageBase64, mimeType, language, occasion }: any) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
Role: Expert Stylist. Analyze image for: ${occasion}.
Output: JSON with 3 personas (editor, hypebeast, boho).
For each: score (1-10), title, critique (max 2 sentences), improvement_tip, 3 highlights (point_2d: [y, x] 0-1000).
Language: ${language.toUpperCase()}.
Constraint: Be extremely concise. No Google Search.
`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      config: { responseMimeType: "application/json", maxOutputTokens: 1000 },
      contents: [prompt, { inlineData: { data: imageBase64, mimeType } }],
    }) as any;

    const data = JSON.parse(result.text.replace(/```json/g, "").replace(/```/g, "").trim());
    return data.results || data;
  } catch (err) {
    console.error("AI Analysis Failed", err);
    throw err;
  }
};

export const recommendOutfit = async ({ apiKey, imageBase64, mimeType, language, userRequest }: any) => {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Style Me: ${userRequest}. Lang: ${language}. JSON format: user_analysis, outfit_name, items, reasoning, dos, donts, visual_prompt (photoreal EN).`;

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