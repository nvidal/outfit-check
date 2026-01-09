import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true;
    };

    if (typeof window !== 'undefined') {
      const standalone = checkStandalone();
      
      // Strict iOS detection
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      // Strict macOS Safari detection (Safari on Mac doesn't support beforeinstallprompt)
      const isMac = /Macintosh/i.test(navigator.userAgent);
      const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
      const macSafari = isMac && isSafari && !ios;

      setIsStandalone(standalone);
      setIsIOS(ios);
      setIsMacSafari(macSafari);
      
      // Manual "Installable" flag for Apple browsers that don't support beforeinstallprompt
      if ((ios || macSafari) && !standalone) {
        setIsInstallable(true);
      }
    }

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
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
    }
  };

  return { isInstallable, install, isIOS, isMacSafari, isStandalone };
};