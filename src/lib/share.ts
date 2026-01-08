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

    const canvas = await html2canvas(element, {
      scale: 1,
      backgroundColor: '#0a428d',
      useCORS: true,
      allowTaint: true,
      width: 1080,
      height: 1920,
      logging: false
    });

    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('Failed to generate blob');

    const file = new File([blob], 'outfit-check.jpg', { type: 'image/jpeg' });
    const shareUrl = scanId ? `${window.location.origin}/share/${scanId}` : '';

    if (navigator.share && navigator.canShare({ files: [file] })) {
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
    } else {
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        alert(t('link_copied', 'Link copied to clipboard!'));
      } else {
        const link = document.createElement('a');
        link.download = 'outfit-check.jpg';
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
      }
    }
  } catch (err) {
    console.error('Sharing failed', err);
    // Don't show error if user cancelled the share sheet
    if ((err as Error).name !== 'AbortError') {
      alert(t('share_error', 'Could not generate share image'));
    }
  } finally {
    onLoading?.(false);
  }
};
