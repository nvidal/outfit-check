# Development Roadmap

## Phase 1: Local Setup (The Skeleton)

[ ] Initialize React + Vite Project (npm create vite@latest .).

[ ] Install dependencies: npm install axios react-i18next i18next lucide-react (icons).

[ ] Install Tailwind CSS.

[ ] Create folder structure: /src/components, /netlify/functions.

## Phase 2: The Backend (Gemini + Netlify)

[ ] Get Gemini API Key from Google AI Studio.

[ ] Install Netlify CLI: npm install -g netlify-cli.

[ ] Create /netlify/functions/analyze.ts.

[ ] Implement the GoogleGenerativeAI call with the prompts from PROMPTS.md.

[ ] Test the function locally using netlify dev.

## Phase 3: The Frontend (UI & i18n)

[ ] Set up i18n.ts with basic English/Spanish translations for UI buttons.

[ ] Build CameraCapture component (input type='file').

[ ] Build ModeSelector component (Tab UI).

[ ] Connect Frontend to Backend (axios.post('/.netlify/functions/analyze')).

[ ] Display the JSON result prettily (Score badge, Critique text).

## Phase 4: Database (Neon + Storage)

[ ] Create Neon Project & get Connection String.

[ ] Install Postgres driver in functions: npm install @neondatabase/serverless.

[ ] Provision a Supabase Storage bucket (or similar free object store) and make it public.

[ ] Add Netlify env vars for SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_BUCKET.

[ ] Modify analyze.ts so it uploads each image (max 6 MB) before calling Gemini, then persist both the `image_url` and AI response into `scans`.

## Phase 5: Deployment

[ ] Push to GitHub.

[ ] Connect GitHub repo to Netlify.

[ ] Add Environment Variables in Netlify Dashboard (GEMINI_API_KEY, DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_BUCKET).

[ ] Deploy.