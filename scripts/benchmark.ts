/* eslint-disable */
// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API_URL = 'http://localhost:8888/.netlify/functions/analyze';
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

const IMAGES = [
  { name: 'Editor Style (Edgy)', file: 'outfit_editor.jpg' },
  { name: 'Casual Style (Comfy)', file: 'outfit_casual.jpg' }
];

async function runBenchmark() {
  console.log('👗 Starting Persona Benchmark...\n');
  console.log(`Target: ${API_URL}`);
  console.log('Ensure "netlify dev" is running in another terminal!\n');

  const allResults: Record<string, PersonaAnalysisResult[]> = {};

  for (const img of IMAGES) {
    const filePath = path.join(FIXTURES_DIR, img.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    console.log(`\n📸 Analyzing: ${img.name}...`);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg'; // Assuming jpg for now based on curl

    try {
      const start = Date.now();
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:${mimeType};base64,${base64}`,
          language: 'en',
          occasion: 'general'
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
      }

      const data = await response.json();
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      
      console.log(`✅ Done in ${duration}s. Scan ID: ${data.id}`);
      
      // Store raw results
      allResults[img.name] = data.results;

      // Print Summary
      console.table(data.results.map((r: PersonaAnalysisResult) => ({
        Persona: r.persona.toUpperCase(),
        Score: r.score,
        Title: r.title,
        Critique: r.critique.substring(0, 60) + '...'
      })));

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed: ${errorMessage}`);
    }
  }

  // Save full results for comparison
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const outputFile = path.join(scriptDir, 'benchmark_last_run.json');
  fs.writeFileSync(outputFile, JSON.stringify(allResults, null, 2));
  console.log(`\n💾 Full results saved to: ${outputFile}`);
}

runBenchmark();
