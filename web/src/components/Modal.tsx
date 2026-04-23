
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  accentColor?: string;
  shadowColor?: string;
  children: React.ReactNode;
  maxWidth?: string;
  customHeader?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  accentColor = 'var(--col-blue)',
  shadowColor,
  children,
  maxWidth = 'max-w-2xl',
  customHeader
}) => {
  if (!isOpen) return null;

  // Жесткая Bauhaus-тень (как у карточек, но чуть больше смещение для объема)
  // Если shadowColor нет, используем акцентный цвет с прозрачностью 20%
  const bauhausShadow = shadowColor 
    ? `12px 12px 0px 0px ${shadowColor}` 
    : `12px 12px 0px 0px color-mix(in srgb, ${accentColor} 20%, transparent)`;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`w-full ${maxWidth} bg-[var(--bg-surface)] border-2 border-[var(--border-color)] my-auto animate-modal-in relative overflow-visible`}
        style={{ 
          boxShadow: bauhausShadow,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Акцентная линия сверху */}
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] z-50"
          style={{ backgroundColor: accentColor }}
        />

        {/* Заголовок в стиле ТЗ */}
        {!customHeader ? (
          <div className="flex justify-between items-center px-8 py-7 bg-[var(--bg-main)] border-b border-[var(--border-color)]">
            {title && (
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-[var(--text-main)] mono">
                {title}
              </h3>
            )}
            <button 
              onClick={onClose} 
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={22} />
            </button>
          </div>
        ) : (
          customHeader
        )}

        <div className="p-10 relative">
          {children}
        </div>
      </div>
    </div>
  );
};
