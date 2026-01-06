# Outfit Check 👗

**Project Type:** Full-Stack Web Application (Serverless PWA)

## Project Overview

**Outfit Check** is an AI-powered fashion coach that provides instant, visually-grounded feedback on outfits. It leverages **Google Gemini 3 Flash** (Preview) to analyze images, identify key items, and offer critiques based on different "personas" (e.g., Editor, Hypebeast, Boho).

The application is designed as a **mobile-first PWA** and supports multiple languages (English/Spanish).

## Architecture

The project uses a **Serverless Proxy** architecture to keep API keys secure.

*   **Frontend:** React 19, Vite 7, Tailwind CSS v4.
    *   Handles image capture, display, and UI interactions.
    *   Communicate with backend via `/.netlify/functions/*`.
    *   **PWA:** Configured with `vite-plugin-pwa` for offline support and installability.
*   **Backend:** Netlify Functions (TypeScript).
    *   `netlify/functions/analyze.ts`: The core logic. Validates usage limits (IP-based), uploads to Storage, calls Gemini, and saves to DB.
    *   `netlify/functions/delete-scan.ts`: Deletes a scan from DB and Storage.
    *   `netlify/functions/get-history.ts`: Fetches user history.
    *   `netlify/functions/get-scan.ts`: Fetches single scan for sharing.
*   **Services:**
    *   **AI:** Google Gemini (via `@google/genai`).
    *   **Auth:** Supabase Auth (Email/Password).
    *   **Storage:** Supabase Storage (bucket: `outfits`).
    *   **Database:** Neon (PostgreSQL) (table: `scans`).

## Building and Running

**Prerequisites:** Node.js (v20+), Netlify CLI.

### 1. Setup Environment
Create a `.env` file in the root directory with the following keys:
```env
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=... # Backend
VITE_SUPABASE_URL=... # Frontend
VITE_SUPABASE_ANON_KEY=... # Frontend
DATABASE_URL=...
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
**Important:** Use `netlify dev` to emulate the full serverless environment.

```bash
netlify dev
```
Local: `http://localhost:8888`

### 4. Build
```bash
npm run build
```

## Development Conventions

*   **Styling:** Tailwind CSS v4. *Note:* Avoid `oklch` colors in components rendered to canvas (`html2canvas`) like `ShareCard.tsx`.
*   **State:** Local React state + Context for Auth (`src/hooks/useAuth.ts`).
*   **i18n:** `react-i18next`. Strings in `src/i18n.ts`.
*   **Types:** Shared types in `src/types/index.ts`.
*   **Security:** 
    *   Backend functions verify `Authorization: Bearer <token>`.
    *   Rate limiting: 3 scans/24h for guests, 50 for registered users (IP-based).
    *   Manual deletions available in History page.

## Key Files

*   `src/pages/ScanPage.tsx`: Main logic for camera, upload, analysis, and result display.
*   `src/components/ShareCard.tsx`: Robust vertical image generation using Inline SVG for absolute alignment.
*   `src/lib/share.ts`: Unified sharing utility.
*   `netlify/functions/analyze.ts`: Backend orchestrator with localized errors.
*   `src/components/Logo.tsx`: Centralized brand logo using the official SVG.
