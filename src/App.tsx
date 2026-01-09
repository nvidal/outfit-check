import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ScanPage } from './pages/ScanPage';
import { RecommendPage } from './pages/RecommendPage';
import { HistoryPage } from './pages/HistoryPage';
import { SharePage } from './pages/SharePage';
import './i18n';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/recommend" element={<RecommendPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/share/:id" element={<SharePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;