import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_title": "Outfit Check",
      "upload_btn": "Take Photo / Upload",
      "take_photo": "Take Photo",
      "choose_gallery": "Choose from Gallery",
      "analyzing": "Analyzing your fit...",
      "mode_editor": "The Editor",
      "mode_hypebeast": "The Hypebeast",
      "mode_boho": "The Boho Bestie",
      "occasion_label": "Occasion",
      "occasion_date": "Date Night",
      "occasion_work": "Office",
      "occasion_casual": "Casual",
      "judgment": "Check",
      "score": "Score",
      "improvement_tip": "Tip",
      "another_try": "Try another look",
      "persona_label": "Judged by",
      "analysis_error": "Failed to analyze outfit. Please try again.",
      "landing_subtitle": "Your AI-powered fashion coach. Instant feedback, brutal honesty.",
      "landing_cta_primary": "Check your outfit now!",
      "landing_cta_login": "Login",
      "login_title": "Welcome Back",
      "login_subtitle": "Sign in to access your outfit history.",
      "login_button": "Sign In",
      "signup_title": "Join the Club",
      "signup_subtitle": "Create an account to save your best fits.",
      "signup_button": "Sign Up",
      "switch_to_login": "Already have an account? Sign In",
      "switch_to_signup": "New here? Create an Account",
      "nav_scan": "Check",
      "nav_closet": "My Outfits",
      "my_outfits": "My Outfits",
      "no_history": "No outfits yet.",
      "start_scanning": "Check your first look",
      "limit_reached_signup": "You used your free checks! Sign up to continue.",
      "login_to_continue": "Sign Up to Continue",
      "login_to_continue_short": "Sign Up (Free!)",
      "share_not_supported": "Sharing is not supported on this device",
      "settings": "Settings",
      "logout": "Sign Out",
      "link_copied": "Link copied to clipboard!",
      "share_message": "Look at my Outfit Check,\nI got a {{score}}/10! What do you think?\n{{url}}",
      "confirm": "Confirm",
      "cancel": "Cancel"
    }
  },
  es: {
    translation: {
      "app_title": "Outfit Check",
      "upload_btn": "Tomar Foto / Subir",
      "take_photo": "Tomar Foto",
      "choose_gallery": "Elegir de Galería",
      "analyzing": "Analizando tu outfit...",
      "mode_editor": "La Editora",
      "mode_hypebeast": "El Cool",
      "mode_boho": "Amiga Boho",
      "occasion_label": "Ocasión",
      "occasion_date": "Cita",
      "occasion_work": "Oficina",
      "occasion_casual": "Casual",
      "judgment": "Check",
      "score": "Puntuación",
      "improvement_tip": "Tip",
      "another_try": "Probar otro look",
      "persona_label": "Juzgado por",
      "analysis_error": "No pudimos analizar el outfit. Intenta de nuevo.",
      "landing_subtitle": "Tu coach de moda con IA. Feedback instantáneo y honestidad brutal.",
      "landing_cta_primary": "¡Chequea tu outfit ahora!",
      "landing_cta_login": "Entrar",
      "login_title": "Bienvenido",
      "login_subtitle": "Inicia sesión para ver tu historial.",
      "login_button": "Iniciar Sesión",
      "signup_title": "Únete al Club",
      "signup_subtitle": "Crea una cuenta para guardar tus mejores looks.",
      "signup_button": "Registrarse",
      "switch_to_login": "¿Ya tienes cuenta? Inicia Sesión",
      "switch_to_signup": "¿Nuevo aquí? Crea una cuenta",
      "nav_scan": "Check",
      "nav_closet": "Mis Outfits",
      "my_outfits": "Mis Outfits",
      "no_history": "Aún no hay outfits.",
      "start_scanning": "Chequea tu primer look",
      "limit_reached_signup": "¡Usaste tus chequeos gratis! Regístrate para seguir.",
      "login_to_continue": "Regístrate para continuar",
      "login_to_continue_short": "Regístrate (¡Gratis!)",
      "share_not_supported": "Compartir no está soportado en este dispositivo",
      "settings": "Ajustes",
      "logout": "Cerrar Sesión",
      "link_copied": "¡Enlace copiado!",
      "share_message": "Mira mi Outfit Check,\n¡Obtuve un {{score}}/10! ¿Qué te parece?\n{{url}}",
      "confirm": "Confirmar",
      "cancel": "Cancelar"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "es", 
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
