# Outfit Check - Development Plan

## Phase 1: Foundation (Router, Logo, Landing)
- [x] Install `react-router-dom`.
- [x] Create `src/components/Logo.tsx` (SVG Logo).
- [x] Create `src/pages/LandingPage.tsx` (Hero + CTA).
- [x] Create `src/pages/LoginPage.tsx` (Supabase Auth Form).
- [x] Refactor `src/App.tsx` to implement Routing and Layout.

## Phase 2: Auth & Backend Logic
- [x] Integrate Supabase Auth Context.
- [x] Implement "3 Free Scans" logic (Guest Mode).
- [x] Update `netlify/functions/analyze.ts` to support User Folders in Storage (`{user_id}/filename.jpg`).
- [x] Ensure RLS (Row Level Security) or backend checks for authenticated uploads.

## Phase 3: History & Sharing
- [x] Create `netlify/functions/get-history.ts` (Pagination).
- [x] Create `src/pages/HistoryPage.tsx` ("My Outfits").
- [x] Implement Card Component (Thumbnail | Title/Score | Share Icon).
- [x] Enable "Click to View Detail" (Reusing Result View).
- [x] Implement "Share" functionality (Native Share API or Copy Link).
- [x] Add Infinite Scroll to History (Initial load of 20 implemented).

## Phase 4: Polish & Features
- [ ] Make the PWA installable.
- [ ] Fix share feature (oklch error).
- [ ] Adapt and use new logo.
- [ ] Enhanced Scanning Animation (Laser Line).
- [ ] Persona-specific Theming (Editor/Hypebeast/Boho).
- [ ] Onboarding describing the personas.
- [ ] Swipe-to-delete in History.

## Known Challenges & Context
- **iOS PWA:** Requires `navigateFallbackDenylist` in `vite.config.ts` to avoid intercepting Netlify Function calls.
- **html2canvas:** Does not support `oklch` colors (Tailwind v4 default). All shareable components must use inline HEX/RGBA styles.
- **Camera:** `react-easy-crop` integration requires careful handling of file inputs and state to prevent UI locking.