# Technical Specification

## 1. Stack Overview
* **Frontend:** React (v18+) + Vite.
* **Language:** TypeScript.
* **Styling:** Tailwind CSS.
* **State/Routing:** React Router DOM (if needed later).
* **Internationalization:** `react-i18next` (for UI text).
* **Hosting & Functions:** Netlify (Static Site + Netlify Functions).
* **Database:** Neon (Serverless PostgreSQL).
* **AI Engine:** Google Gemini 3 Pro (via Google AI Studio API).

## 2. Architecture: Serverless Proxy
We do not expose the Gemini API key in the frontend.

`[Client (React)]` -> `[POST /api/analyze]` (Netlify Function) -> `[Gemini API]` & `[Neon DB]`

## 3. Database Schema (PostgreSQL)
We will use a hybrid SQL/JSON approach to keep it flexible.

**Table: `scans`**
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `UUID` | Primary Key (Default: `gen_random_uuid()`). |
| `user_id` | `TEXT` | Optional identifier for the logged-in user or session. |
| `user_name` | `TEXT` | Optional display name for the current user. |
| `image_url` | `TEXT` | URL of the uploaded image (or omit if not storing images yet). |
| `occasion` | `TEXT` | 'casual', 'work', 'date'. |
| `language` | `VARCHAR(5)` | 'en', 'es'. |
| `ai_results` | `JSONB` | Stores an array of persona-specific responses (`persona`, score, critique, highlights, etc.). |
| `created_at` | `TIMESTAMP` | Default: `NOW()`. |

## 4. API Interface (Netlify Function)
**Endpoint:** `POST /netlify/functions/analyze`

**Request Body:**
```json
{
  "image": "base64_string...",
  "language": "es",
  "occasion": "casual",
  "user_id": "optional-session-id",
  "user_name": "Optional display name"
}
```

**Response Body:**
```json
[
  {
    "persona": "editor",
    "score": 8,
    "title": "Good basics, poor fit",
    "critique": "Los pantalones son demasiado largos y arruinan la silueta de los zapatos. La combinación de colores es correcta, pero el ajuste general se ve descuidado.",
    "improvement_tip": "Haz un dobladillo a los pantalones o usa botas más altas.",
    "highlights": [ ... ]
  },
  {
    "persona": "hypebeast",
    ...
  }
]
```

Each entry uses the persona label so the client can render tabs and highlight the selected voice while switching instantly without making additional API calls.

## 5. Internationalization Strategy

**UI Components**: Use i18next for buttons like "Upload Photo", "Select Mode".

**AI Content**: Pass the language param to the system prompt (see PROMPTS.md).

## 6. Image Storage & Upload

* **Upload Flow:** The function first uploads the base64 photo to Supabase Storage (or another free object store) and uses the returned public URL when calling Gemini. This upload must finish before the analysis begins.
* **Size Limit:** Reject photos over 6 MB and inform the user so the front-end can surface the limit.
* **Persistence:** After Gemini replies, insert a new `scans` row with `image_url`, `mode`, `language`, and the parsed AI response. The data is stored in Neon to enable future features such as history or analytics.
* **Environment Variables:** Provide `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`, and `DATABASE_URL` (plus `GEMINI_API_KEY`) in Netlify so the function can authenticate both storage and Neon.

## 7. Resetting the scans table

If you need to drop and recreate the `scans` table (e.g., wiping old persona-based rows), run the SQL script located at `scripts/reset_scans_table.sql`. It recreates the table with the current `user_id`, `user_name`, and `ai_results` schema.
