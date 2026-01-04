import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onError?: (message: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError }) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        setPreview(result);
        onError?.('');
        const compressed = await compressImage(result);
        onCapture(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerInput = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full h-full">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        ref={inputRef}
        className="hidden"
      />
      
      {!preview ? (
        <button
          onClick={triggerInput}
          className="w-full h-full min-h-75 border-4 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-all"
        >
          <Camera size={64} className="mb-4 opacity-40" />
          <span className="font-black text-xl uppercase tracking-widest">{t('upload_btn')}</span>
        </button>
      ) : (
        <div className="relative h-full min-h-75 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-black">
          <img 
            src={preview} 
            alt="Outfit Preview" 
            className="w-full h-full object-cover"
          />
          <button
            onClick={triggerInput}
            className="absolute bottom-4 right-4 bg-white p-4 rounded-2xl shadow-xl text-[#0a428d] transition active:scale-90"
          >
            <Upload size={24} />
          </button>
        </div>
      )}
    </div>
  );
};
