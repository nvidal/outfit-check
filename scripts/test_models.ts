import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("No API KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(scriptDir, 'fixtures', 'outfit_casual.jpg');
const buffer = fs.readFileSync(fixturePath);
const base64 = buffer.toString('base64');

async function testModel(modelName: string) {
  console.log(`Testing ${modelName}...`);
  const start = Date.now();
  try {
    const result = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Describe this outfit in 5 words." },
            { inlineData: { mimeType: "image/jpeg", data: base64 } }
          ]
        }
      ],
    });
    const duration = (Date.now() - start) / 1000;
    console.log(`✅ ${modelName} success in ${duration.toFixed(2)}s. Response: ${result.response.text()}`);
    return duration;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.log(`❌ ${modelName} failed: ${message}`);
    return null;
  }
}

async function run() {
  console.log("Fetching available models...");
  try {
    // @ts-expect-error - .list() might not be perfectly typed in some SDK versions
    const models = await ai.models.list(); 
    console.log("Available models:");
    for await (const m of models) {
        if (m.name.includes("flash")) {
            console.log(` - ${m.name}`);
        }
    }
  } catch (e: unknown) {
    console.log("Could not list models", e);
  }

  await testModel("gemini-2.0-flash-exp");
  await testModel("gemini-2.5-flash-image");
  await testModel("gemini-3-flash-preview");
}

run();
