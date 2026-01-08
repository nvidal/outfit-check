import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = 'http://localhost:8888/.netlify/functions/analyze';
const FICTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const MODELS = [
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp (Baseline)' },
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' }
];

const IMAGES = [
  { name: 'Editor Style', file: 'outfit_editor.jpg' }
];

interface BenchmarkResult {
  Model: string;
  Time: string;
  LanguageCheck: string;
}

async function compareModels() {
  console.log('🚀 Starting Model Comparison Benchmark...\n');
  console.log(`Target: ${API_URL}`);
  console.log('Ensure "netlify dev" is running!\n');

  for (const img of IMAGES) {
    const filePath = path.join(FICTURES_DIR, img.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    console.log(`\n📸 Analyzing Image: ${img.name}`);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg';

    const results: BenchmarkResult[] = [];

    for (const model of MODELS) {
      process.stdout.write(`   Running ${model.label}... `);
      try {
        const start = Date.now();
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: `data:${mimeType};base64,${base64}`,
            language: 'es',
            occasion: 'general',
            model: model.id
          })
        });

        const duration = (Date.now() - start) / 1000;

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`API Error ${response.status}: ${text}`);
        }

        const data = await response.json() as { results: { critique: string }[] };
        const firstResult = data.results[0];
        const langCheck = firstResult.critique.substring(0, 20);

        console.log(`Done in ${duration.toFixed(2)}s`);
        results.push({
          Model: model.label,
          Time: `${duration.toFixed(2)}s`,
          LanguageCheck: langCheck
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.log(`❌ Failed: ${message}`);
        results.push({
          Model: model.label,
          Time: 'FAILED',
          LanguageCheck: 'N/A'
        });
      }
    }

    console.table(results);
  }
}

compareModels();
