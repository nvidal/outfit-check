import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import './i18n';

const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const ScanPage = lazy(() => import('./pages/ScanPage').then(module => ({ default: module.ScanPage })));
const RecommendPage = lazy(() => import('./pages/RecommendPage').then(module => ({ default: module.RecommendPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(module => ({ default: module.HistoryPage })));
const SharePage = lazy(() => import('./pages/SharePage').then(module => ({ default: module.SharePage })));

const Loading = () => (
  <div className="flex h-dvh w-full items-center justify-center bg-[#0a428d]">
    <Sparkles className="h-12 w-12 animate-spin text-white" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/share/:id" element={<SharePage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;