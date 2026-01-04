import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScanEye, Flame, Flower2 } from 'lucide-react';

export type Mode = 'editor' | 'hypebeast' | 'boho';

interface ModeSelectorProps {
  selectedMode: Mode;
  onSelectMode: (mode: Mode) => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({ selectedMode, onSelectMode }) => {
  const { t } = useTranslation();

  const modes = [
    { id: 'editor', label: t('mode_editor'), icon: ScanEye },
    { id: 'hypebeast', label: t('mode_hypebeast'), icon: Flame },
    { id: 'boho', label: t('mode_boho'), icon: Flower2 },
  ];

  return (
    <div className="flex gap-2 w-full">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <button
            key={mode.id}
            onClick={() => onSelectMode(mode.id as Mode)}
            className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200
              ${isSelected 
                ? 'border-white bg-white text-[#0a428d] scale-105 shadow-xl' 
                : 'border-white/20 text-white bg-white/5 hover:bg-white/10'
              }`}
          >
            <Icon size={20} className="mb-1" />
            <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
};
