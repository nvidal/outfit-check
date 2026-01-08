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
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true;
      
      const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      setIsStandalone(isStandaloneMode);
      setIsIOS(isIOSDevice);
      
      // On iOS, we can't programmatically trigger the prompt, 
      // but we want to know if it's installable (not already installed)
      if (isIOSDevice && !isStandaloneMode) {
        setIsInstallable(true);
      }
    }

    const handler = (e: Event) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Save the event so it can be triggered later
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (isIOS) {
      // For iOS, we just return true to let the UI know it should show instructions
      return true;
    }

    if (!installPrompt) return;

    // Show the native prompt
    installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setInstallPrompt(null);
  };

  return { isInstallable, install, isIOS, isStandalone };
};
