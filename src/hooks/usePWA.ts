import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Extend Navigator for iOS standalone property
interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

const checkStandalone = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches 
    || (window.navigator as NavigatorWithStandalone).standalone === true;
};

const getIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const getMacSafari = () => {
  if (typeof window === 'undefined') return false;
  const ios = getIOS();
  const isMac = /Macintosh/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
  return isMac && isSafari && !ios;
};

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(getIOS);
  const [isMacSafari] = useState(getMacSafari);
  const [isStandalone, setIsStandalone] = useState(checkStandalone);
  const [isInstallable, setIsInstallable] = useState(() => {
    const standalone = checkStandalone();
    const apple = getIOS() || getMacSafari();
    return apple && !standalone;
  });

  useEffect(() => {
    const handler = (e: Event) => {
      // Prevent the default browser prompt
      e.preventDefault();
      
      // Save the event for Chromium browsers
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Only set installable if NOT already in standalone mode
      if (!checkStandalone()) {
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for changes in display mode (e.g. if user installs it)
    const matcher = window.matchMedia('(display-mode: standalone)');
    const mHandler = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
      if (e.matches) {
        setIsInstallable(false);
      }
    };
    matcher.addEventListener('change', mHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      matcher.removeEventListener('change', mHandler);
    };
  }, []);

  const install = async () => {
    if (isIOS || isMacSafari) {
      // For Apple browsers, we show manual instructions
      return true;
    }

    if (!installPrompt) return;

    // Show the native prompt for Chrome/Edge
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
    }
  };

  return { isInstallable, install, isIOS, isMacSafari, isStandalone };
};
