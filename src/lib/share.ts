import html2canvas from 'html2canvas';

interface ShareOptions {
  element: HTMLElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, options?: any) => string;
  score: number;
  scanId?: string;
  language?: string;
  onLoading?: (loading: boolean) => void;
}

export const shareOutfit = async ({ element, t, score, scanId, language, onLoading }: ShareOptions) => {
  try {
    onLoading?.(true);
    await document.fonts.ready;
    // Delay to ensure everything is rendered
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use iOS-safe canvas dimensions (720x1280 = 921,600 pixels, well below iOS limits)
    // This prevents "image cannot be created" errors on iOS Safari
    console.log('[Share] Starting canvas generation...');
    const canvas = await html2canvas(element, {
      scale: 1,
      backgroundColor: '#0a428d',
      useCORS: false,  // Disable CORS since we use base64 images
      allowTaint: true,
      width: 720,
      height: 1280,
      logging: false
    });

    console.log('[Share] Canvas created:', canvas.width, 'x', canvas.height);

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) {
      console.error('[Share] Blob generation failed');
      throw new Error('Failed to generate blob');
    }
    
    console.log('[Share] Blob created, size:', blob.size);

    const file = new File([blob], 'outfit-check.jpg', { type: 'image/jpeg' });
    const shareUrl = scanId ? `${window.location.origin}/share/${scanId}` : '';

    // Check if Web Share API is available and can share files
    let canShareFiles = false;
    try {
      // @ts-expect-error - canShare may not exist in all browsers despite TypeScript types
      if (navigator.share && navigator.canShare) {
        canShareFiles = navigator.canShare({ files: [file] });
        console.log('[Share] canShare check result:', canShareFiles);
      } else {
        console.log('[Share] navigator.share or canShare not available');
      }
    } catch (e) {
      console.warn('[Share] canShare check failed:', e);
    }

    if (canShareFiles) {
      console.log('[Share] Attempting to share via Web Share API...');
      await navigator.share({
        files: [file],
        title: t('app_title'),
        text: t('share_message', { 
          score, 
          lng: language,
          url: shareUrl 
        }),
        url: shareUrl || undefined
      });
      console.log('[Share] Share completed successfully');
    } else {
      console.log('[Share] Using fallback method');
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        alert(t('link_copied', 'Link copied to clipboard!'));
      } else {
        const link = document.createElement('a');
        link.download = 'outfit-check.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      }
    }
  } catch (err) {
    console.error('[Share] Error occurred:', err);
    
    // Safely extract error properties
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('[Share] Error name:', error.name);
    console.error('[Share] Error message:', error.message);
    console.error('[Share] Error stack:', error.stack);
    
    // Don't show error if user cancelled the share sheet
    if (error.name !== 'AbortError') {
      // Provide more helpful error message for users
      const errorMsg = error.message || '';
      const isCanvasError = errorMsg.includes('blob') || 
                           errorMsg.includes('canvas') || 
                           errorMsg.includes('image');
      
      const errorMessage = isCanvasError
        ? t('share_error_canvas', 'Could not generate image. Try again or contact support.')
        : t('share_error', 'Could not share image');
      alert(errorMessage);
    }
  } finally {
    onLoading?.(false);
  }
};
