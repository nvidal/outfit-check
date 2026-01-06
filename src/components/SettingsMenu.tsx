import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, Globe, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const SettingsMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-white text-[#0a428d] shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-1">
            <button
              onClick={toggleLanguage}
              className="w-full px-4 py-3 flex items-center gap-3 text-sm font-bold uppercase tracking-wide hover:bg-gray-100 transition text-left"
            >
              <Globe size={18} />
              <span>{i18n.language === 'en' ? 'Español' : 'English'}</span>
            </button>

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
        </div>
      )}
    </div>
  );
};
