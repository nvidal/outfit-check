import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Globe, User, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../hooks/usePWA';

export const SettingsMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const { isInstallable, install, isIOS } = usePWA();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowIOSInstructions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
    setIsOpen(false);
  };

  const handleLogin = () => {
    navigate('/login');
    setIsOpen(false);
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      await install();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-white/10 transition active:scale-95"
        title={t('settings', 'Settings')}
      >
        <Settings size={24} className="text-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white text-[#0a428d] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {showIOSInstructions ? (
            <div className="p-5 flex flex-col gap-3">
              <h3 className="font-black uppercase tracking-wider text-xs border-b pb-2">
                {t('install_ios_title', 'Install App')}
              </h3>
              <p className="text-xs font-bold leading-relaxed opacity-80">
                {t('install_ios_instructions')}
              </p>
              <button
                onClick={() => setShowIOSInstructions(false)}
                className="mt-2 w-full py-2 bg-[#0a428d] text-white rounded-xl text-xs font-black uppercase tracking-[0.2em]"
                aria-label={t('close_ios_instructions', 'Close installation instructions')}
              >
                {t('confirm', 'Got it')}
              </button>
            </div>
          ) : (
            <div className="py-1">
              <button
                onClick={toggleLanguage}
                className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition text-left"
              >
                <Globe size={18} />
                <span>{i18n.language === 'en' ? 'Español' : 'English'}</span>
              </button>

              {isInstallable && (
                <>
                  <div className="h-px bg-gray-100 my-1" />
                  <button
                    onClick={handleInstall}
                    className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition text-left text-amber-600"
                  >
                    <Download size={18} />
                    <span>{t('install_app', 'Install App')}</span>
                  </button>
                </>
              )}

              <div className="h-px bg-gray-100 my-1" />

              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-rose-500 hover:bg-rose-50 transition text-left"
                >
                  <LogOut size={18} />
                  <span>{t('logout', 'Sign Out')}</span>
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition text-left"
                >
                  <User size={18} />
                  <span>{t('login_button', 'Sign In')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
