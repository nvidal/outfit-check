import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.session) {
          navigate('/scan');
        } else {
          setMessage(t('signup_success', 'Check your email for the confirmation link!'));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/scan');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex h-dvh flex-col bg-[#0a428d] text-white p-6 font-sans">
      <header className="relative flex items-center justify-center shrink-0 mb-8">
        <button 
          onClick={handleBack}
          className="absolute left-0 p-2 rounded-full hover:bg-white/10 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black tracking-tight">
            {isSignUp ? t('signup_title', 'Join the Club') : t('login_title', 'Welcome Back')}
          </h1>
          <p className="text-white/60">
            {isSignUp 
              ? t('signup_subtitle', 'Create an account to save your best fits.') 
              : t('login_subtitle', 'Sign in to access your outfit history.')}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider ml-1 opacity-80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/20 p-4 outline-none focus:border-white transition placeholder:text-white/30"
              placeholder="fashion@icon.com"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider ml-1 opacity-80">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/10 border border-white/20 p-4 outline-none focus:border-white transition placeholder:text-white/30"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-200 text-sm font-medium text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-sm font-medium text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 rounded-2xl bg-white py-4 text-lg font-black uppercase tracking-widest text-[#0a428d] shadow-lg transition hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {loading ? '...' : (isSignUp ? t('signup_button', 'Sign Up') : t('login_button', 'Sign In'))}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-sm font-bold opacity-70 hover:opacity-100 underline decoration-white/30 underline-offset-4 transition"
          >
            {isSignUp 
              ? t('switch_to_login', 'Already have an account? Sign In') 
              : t('switch_to_signup', 'New here? Create an Account')}
          </button>
        </div>
      </main>
    </div>
  );
};
