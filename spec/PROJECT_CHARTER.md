# Project Charter: Outfit Check

## 1. Vision
To create a personal AI stylist web app that offers opinionated, persona-based critiques. It bridges the gap between generic "object recognition" and a human personal stylist who understands context, vibes, and trends.

## 2. Core Value Proposition
* **Multi-Modal Critiques:** Users switch between "The Editor" (Classic), "The Hypebeast" (Trendy), and "The Boho Bestie" (Expressive).
* **Bilingual Support:** Native-level advice in both English and Spanish (`en`/`es`).
* **Context Aware:** Advice changes based on occasion (Date vs. Interview) and current trends (2025/2026).
* **Instant Improvements:** Actionable advice (tuck shirt, change shoes) + Links to buy.

## 3. The "Fashionista" Personas
| Persona | Focus | Tone |
| :--- | :--- | :--- |
| **The Timeless Editor** | Proportions, Tailoring, Geometry | Ruthless, educational, "Vogue" style. |
| **The Hypebeast Scout** | Trends, Brand Heat, Aesthetics | Slang-heavy, focus on "vibes" & silhouette. |
| **The Boho Bestie** | Texture, Color Harmony, Expression | Warm, supportive, focus on "feeling." |

## 4. User Flow (MVP)
1.  **Upload:** User takes a photo or uploads from the camera roll.
2.  **Context:**
    * **Select Mode:** Editor / Hypebeast / Boho.
    * **Select Language:** English / Español.
    * **Occasion (Optional):** Date, Work, Casual.
3.  **Analysis:** The image is sent to the serverless backend.
4.  **Result:**
    * **Score:** 1-10.
    * **The Roast/Toast:** The personality's specific critique in the chosen language.
    * **The Fix:** 1 concrete change.
    * **Shop:** Buttons to Google Shopping for recommended items.