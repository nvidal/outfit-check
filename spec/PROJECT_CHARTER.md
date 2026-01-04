# Project Charter: Outfit Check

## 1. Vision
To create a personal AI stylist web app that offers opinionated, persona-based critiques. It bridges the gap between generic "object recognition" and a human personal stylist who understands context, vibes, and trends.

## 2. Core Value Proposition
* **Multi-Modal Critiques:** All three personas evaluate the fit at once, and the results page surfaces persona tabs so users can flip instantly without rerunning analysis.
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
    * **Select Language:** English / Español (only available before analysis).
    * **Occasion (Optional):** Date, Work, Casual.
3.  **Analysis:** The image is sent to the serverless backend.
4.  **Result:**
    * **Persona Tabs:** Show each persona label and highlight which one is active (default to the persona with the best score).
    * **Score:** 1-10 per persona.
    * **The Roast/Toast:** Each persona offers its stylistic critique in the chosen language.
    * **The Fix:** One concrete improvement per persona.
    * **Shop:** Buttons to Google Shopping for recommended items.