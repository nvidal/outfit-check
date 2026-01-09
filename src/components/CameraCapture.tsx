import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, X, Pencil } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { getCroppedImg } from '../lib/cropImage';
import { OutfitImage } from './OutfitImage';

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  onError?: (message: string) => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onError }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Helper to read file as Data URL
  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve, reject) => {
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
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const result = await readFile(file);
        setRawImage(result);
        
        const compressed = await compressImage(result);
        onCapture(compressed);
        setPreview(compressed);
        onError?.('');
      } catch (e) {
        console.error(e);
        onError?.('Failed to process image');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleEditClick = () => {
    setIsCropping(true);
  };

  const handleCropConfirm = async () => {
    if (!rawImage || !croppedAreaPixels) return;
    try {
      const croppedBase64 = await getCroppedImg(rawImage, croppedAreaPixels);
      const compressed = await compressImage(croppedBase64);
      setPreview(compressed);
      setIsCropping(false);
      onError?.('');
      onCapture(compressed);
    } catch (e) {
      console.error(e);
      onError?.('Failed to crop image');
    }
  };

  const handleCropCancel = () => {
    setIsCropping(false);
  };

  const handleRetake = () => {
    setPreview(null);
    setRawImage(null);
    fileInputRef.current?.click();
  };

  if (isCropping && rawImage) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        <div className="relative flex-1">
          <Cropper
            image={rawImage}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        <div className="relative z-[101] bg-black/90 p-6 pb-safe flex justify-between items-center gap-4">
          <button
            onClick={handleCropCancel}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 text-white font-bold uppercase tracking-wider text-sm active:scale-95 transition"
          >
            <X size={18} />
            {t('cancel')}
          </button>
          <button
            onClick={handleCropConfirm}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-white text-[#0a428d] font-black uppercase tracking-wider text-sm active:scale-95 transition shadow-lg"
          >
            <Check size={18} />
            {t('confirm')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <input
        type="file"
        accept="image/*"
        multiple={false}
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
      />
      
      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-full border-4 border-dashed border-blue-400/40 rounded-3xl flex flex-col items-center justify-center text-white bg-white/5 hover:bg-white/10 transition-all active:scale-95"
        >
          <Camera size={48} className="mb-3 opacity-40" />
          <span className="font-black text-sm uppercase tracking-widest">{t('upload_btn')}</span>
        </button>
      ) : (
        <div className="relative h-full">
          <OutfitImage 
            image={preview} 
            className="h-full border-blue-400/40"
          />
          <div className="absolute bottom-4 right-4 flex gap-3 z-10">
            <button
              onClick={handleEditClick}
              className="bg-white p-3 rounded-2xl shadow-xl text-[#0a428d] transition active:scale-90"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={handleRetake}
              className="bg-white p-3 rounded-2xl shadow-xl text-[#0a428d] transition active:scale-90"
            >
              <Camera size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};