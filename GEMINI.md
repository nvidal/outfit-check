# Outfit Check 👗

**Project Type:** Full-Stack Web Application (Serverless)

## Project Overview

**Outfit Check** is an AI-powered fashion coach that provides instant, visually-grounded feedback on outfits. It leverages **Google Gemini 3 Flash** (Preview) to analyze images, identify key items, and offer critiques based on different "personas" (e.g., Editor, Hypebeast, Boho).

The application is designed with a **mobile-first** approach and supports multiple languages (English/Spanish).

## Architecture

The project uses a **Serverless Proxy** architecture to keep API keys secure.

*   **Frontend:** React 19, Vite 7, Tailwind CSS v4.
    *   Handles image capture, display, and UI interactions.
    *   Communicate with backend via `/.netlify/functions/analyze`.
*   **Backend:** Netlify Functions (TypeScript).
    *   `netlify/functions/analyze.ts`: The core logic.
        1.  Receives base64 image from frontend.
        2.  Uploads image to **Supabase Storage** to get a public URL.
        3.  Calls **Google Gemini API** with the image URL and specific persona prompts.
        4.  Logs the scan metadata to **Neon (PostgreSQL)**.
        5.  Returns parsed JSON results to the frontend.
*   **Services:**
    *   **AI:** Google Gemini (via `@google/genai`).
    *   **Storage:** Supabase Storage (bucket: `outfits`).
    *   **Database:** Neon (PostgreSQL) (table: `scans`).

## Building and Running

**Prerequisites:** Node.js (v20+), Netlify CLI.

### 1. Setup Environment
Create a `.env` file in the root directory with the following keys:
```env
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... # Needed for upload
DATABASE_URL=...
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
**Important:** Use `netlify dev` instead of `npm run dev` or `vite` to ensure the Netlify Functions are emulated correctly and environment variables are injected.

```bash
netlify dev
```
This will start the local server (usually at `http://localhost:8888`).

### 4. Other Commands
*   **Build:** `npm run build` (runs `tsc` and `vite build`).
*   **Lint:** `npm run lint`.

## Development Conventions

*   **Styling:** Tailwind CSS v4 is used for all styling.
*   **State Management:** Local React state (`useState`) is used for this scale.
*   **Internationalization:** Use `react-i18next`. All user-facing strings should be wrapped in `t('key')`.
*   **Backend Communication:** The frontend uses `axios` to POST to `/.netlify/functions/analyze`.
*   **Type Safety:** TypeScript is strictly enforced. Shared interfaces for API responses should be maintained.
*   **Database Changes:** If the schema for the `scans` table needs to change, update `scripts/reset_scans_table.sql` and run it against the Neon database.

## Key Files

*   `src/App.tsx`: Main application component and UI logic.
*   `netlify/functions/analyze.ts`: Backend function orchestrating AI, Storage, and DB.
*   `spec/TECH_SPEC.md`: Detailed technical specification and schema.
*   `spec/PROMPTS.md`: System prompts used for the different personas.
