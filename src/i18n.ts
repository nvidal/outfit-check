import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "app_title": "Outfit Check",
      "upload_btn": "Take Photo / Upload",
      "analyzing": "Analyzing your fit...",
      "mode_editor": "The Editor",
      "mode_hypebeast": "The Hypebeast",
      "mode_boho": "The Boho Bestie",
      "occasion_label": "Occasion (Optional)",
      "occasion_date": "Date Night",
      "occasion_work": "Office",
      "occasion_casual": "Casual",
      "caption": "Instant, minimalist outfit evaluation in seconds.",
      "controls_title": "Controls",
      "expectation_text": "Capture a fit, choose a mood, and the AI will grade the whole vibe with gentle honesty.",
      "waiting_prompt": "Waiting for your moment",
      "what_to_expect": "What to expect",
      "judgment": "Judge Me",
      "score": "Score",
      "improvement_tip": "Improvement Tip",
      "another_try": "Try another look",
    }
  },
  es: {
    translation: {
      "app_title": "Outfit Check",
      "upload_btn": "Tomar Foto / Subir",
      "analyzing": "Analizando tu outfit...",
      "mode_editor": "La Directora",
      "mode_hypebeast": "El Cool",
      "mode_boho": "Amiga Boho",
      "occasion_label": "Ocasión (Opcional)",
      "occasion_date": "Cita",
      "occasion_work": "Oficina",
      "occasion_casual": "Casual",
      "caption": "Evaluación instantánea y minimalista de tu outfit.",
      "controls_title": "Controles",
      "expectation_text": "Captura tu outfit, elige una vibra y la IA te pondrá nota con honestidad amable.",
      "waiting_prompt": "Esperando tu momento",
      "what_to_expect": "Qué esperar",
      "judgment": "Juzgar",
      "score": "Puntuación",
      "improvement_tip": "Consejo",
      "another_try": "Probar otro look",
      "score_label": "Puntuación",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
