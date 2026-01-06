# Outfit Check 👗

An AI-powered fashion coach that provides instant, visually-grounded feedback on your outfits. Powered by **Gemini 2.5 Flash** and built with a modern full-stack serverless architecture.

## ✨ Features

- **🤖 Gemini 2.5 Flash**: Leverages Google's latest multimodal model for lightning-fast analysis and spatial awareness.
- **🎯 Visual Highlights**: Uses `box_2d` coordinates to draw interactive bounding boxes over specific items (shoes, pants, accessories) to show exactly what the AI is critiquing.
- **🎭 Multiple Personas**: All three personas are evaluated before the results screen loads, then the results page lets you switch instantly via persona tabs; the highest-scoring persona opens first.
  - **La Directora (Editor)**: Professional, sophisticated, and ruthless about proportions and tailoring.
  - **El Cool (Hypebeast)**: Gen Z trend scout focused on "drip", "flex", and brand synergy.
  - **Amiga Boho (Bestie)**: Supportive, honest, and encouraging feedback with a warm tone.
- **🌍 Multilingual**: Full support for English (🇬🇧) and Spanish (🇪🇸) via `react-i18next`.
- **⚡ Performance**:
  - **Client-side Compression**: Images are resized and compressed in the browser before upload to ensure fast processing.
  - **Tailwind CSS v4**: Built with the latest CSS-first framework for a high-performance UI.
- **📱 Mobile First**: Designed for a seamless experience on mobile devices with desktop-friendly constraints.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS v4, Lucide React.
- **Backend**: Netlify Functions (TypeScript).
- **AI**: Google Generative AI SDK (\`@google/genai\`).
- **Storage**: Supabase Storage (for image processing).
- **Database**: Neon (PostgreSQL) for logging scan metadata.
- **i18n**: \`react-i18next\`.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20+)
- Netlify CLI (\`npm install -g netlify-cli\`)
- API Keys for:
  - [Google AI Studio](https://aistudio.google.com/) (Gemini API)
  - [Supabase](https://supabase.com/)
  - [Neon](https://neon.tech/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/outfit-check.git
   cd outfit-check
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   DATABASE_URL=your_neon_postgres_url
   ```

4. **Run the development server**:
   ```bash
   # Start Vite and Netlify Functions together
   netlify dev
   ```

5. **Reset the `scans` table (optional)**:
   ```bash
   psql $DATABASE_URL -f scripts/reset_scans_table.sql
   ```

## 📝 License

MIT
