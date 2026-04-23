
import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  ChevronDown, 
  Check, 
  Plus, 
  Sword, 
  Shield, 
  Dumbbell, 
  Wind, 
  Heart, 
  Brain, 
  Sparkles, 
  Users, 
  Clover,
  Zap,
  Trash2
} from 'lucide-react';
import { StatKey } from '../types';

interface BaseInputProps {
  accentColor?: string;
}

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & BaseInputProps> = ({ 
  accentColor = 'var(--col-blue)', 
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <input 
      {...props} 
      onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
      style={{ 
        ...props.style,
        borderColor: isFocused ? accentColor : 'var(--border-color)',
      }}
      className={`w-full bg-[var(--input-bg)] border-2 px-5 py-3 text-xs mono text-[var(--text-main)] focus:outline-none transition-all placeholder:text-[var(--text-muted)] ${className}`} 
    />
  );
};

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & BaseInputProps> = ({ 
  accentColor = 'var(--col-blue)', 
  className = '',
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <textarea 
      {...props} 
      onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
      onBlur={(e) => { setIsFocused(false); props.onBlur?.(e); }}
      style={{ 
        ...props.style,
        borderColor: isFocused ? accentColor : 'var(--border-color)',
      }}
      className={`w-full bg-[var(--input-bg)] border-2 p-4 text-[10px] mono text-[var(--text-main)] focus:outline-none resize-none transition-all placeholder:text-[var(--text-muted)] leading-relaxed ${className}`} 
    />
  );
};

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends BaseInputProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ 
  accentColor = 'var(--col-blue)', 
  value, 
  onChange, 
  options, 
  placeholder = "ВЫБЕРИТЕ...",
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className} ${isOpen ? 'z-[100]' : 'z-10'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          borderColor: isOpen ? accentColor : 'var(--border-color)',
        }}
        className={`w-full bg-[var(--input-bg)] border-2 h-10 px-4 flex items-center justify-between text-[10px] mono text-[var(--text-main)] focus:outline-none transition-all uppercase font-black hover:bg-[var(--bg-surface)] active:scale-[0.99]`}
      >
        <span className={selectedOption ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={14} 
          className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: isOpen ? accentColor : 'var(--text-muted)' }}
        />
      </button>

      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-surface)] border-2 z-[400] max-h-60 overflow-y-auto shadow-2xl animate-appear"
          style={{ borderColor: accentColor }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => {
                if (!option.disabled) {
                  onChange(option.value);
                  setIsOpen(false);
                }
              }}
              className={`w-full px-4 py-3 text-left mono text-[10px] uppercase font-black transition-all flex items-center justify-between
                ${option.disabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-[var(--text-main)] hover:text-[var(--text-inverted)]'}
                ${value === option.value ? 'bg-[var(--text-main)]/5' : ''}
              `}
              style={{ color: value === option.value && !option.disabled ? accentColor : undefined }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={12} style={{ color: accentColor }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: 'primary' | 'secondary' | 'accent-red' | 'accent-yellow' | 'accent-blue' | 'accent-purple' | 'accent-teal' | 'accent-pink', 
  size?: 'sm' | 'md' | 'lg', 
  inverted?: boolean, 
  color?: 'blue' | 'yellow' | 'purple' | 'red' | 'white' | 'grey' | 'teal' | 'pink'
}> = ({ 
  children, 
  variant, 
  size = 'md', 
  className = '', 
  inverted = false,
  color,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-black transition-all duration-300 uppercase tracking-[0.1em] text-[10px] border-2 mono active:scale-95 gap-2";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 h-8",
    md: "px-6 py-2.5 h-10",
    lg: "px-8 py-4 h-14"
  };

  let activeColor = 'var(--col-white)';
  
  // Map simplified color names to CSS variables
  if (color === 'blue' || variant === 'accent-blue') activeColor = 'var(--col-blue)';
  if (color === 'yellow' || variant === 'accent-yellow') activeColor = 'var(--col-yellow)';
  if (color === 'purple' || variant === 'accent-purple') activeColor = 'var(--col-purple)';
  if (color === 'red' || variant === 'accent-red') activeColor = 'var(--col-red)';
  if (color === 'grey') activeColor = 'var(--col-grey)';
  if (color === 'teal' || variant === 'accent-teal') activeColor = 'var(--col-teal)';
  if (color === 'pink' || variant === 'accent-pink') activeColor = 'var(--col-pink)';
  if (color === 'white') activeColor = 'var(--col-white)'; // This is now white in Dark, black in Light

  const buttonColor = activeColor;
  
  // Determine text color based on button state and theme
  const textColor = inverted ? buttonColor : 'var(--text-inverted)';

  const hoverStyles = inverted 
    ? { '--hover-bg': buttonColor, '--hover-text': 'var(--text-inverted)' } as React.CSSProperties
    : { '--hover-bg': 'transparent', '--hover-text': buttonColor } as React.CSSProperties;

  return (
    <button 
      className={`
        ${baseStyles} 
        ${sizeStyles[size]} 
        ${className}
        ${inverted ? 'custom-btn-inverted' : 'custom-btn-solid'}
      `}
      style={{ 
        backgroundColor: !inverted ? buttonColor : 'transparent',
        borderColor: buttonColor,
        color: textColor,
        ...hoverStyles
      }}
      {...props}
    >
      <style>{`
        .custom-btn-inverted:hover {
          background-color: var(--hover-bg) !important;
          color: var(--hover-text) !important;
        }
        .custom-btn-solid:hover {
          background-color: var(--hover-bg) !important;
          color: var(--hover-text) !important;
        }
      `}</style>
      {children}
    </button>
  );
};

export const SectionHeader: React.FC<{
  title: string;
  subtitle: string;
  accentColor: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, accentColor, actions }) => {
  return (
    <header className="w-full mb-12 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6">
        <div className="space-y-3">
          <h1 
            className="text-6xl font-black uppercase tracking-tighter glitch-text leading-[0.9]"
            style={{ color: accentColor }}
          >
            {title}
          </h1>
          <p className="mono text-[var(--text-muted)] uppercase text-[11px] tracking-[0.4em] font-black">
            {subtitle}
          </p>
        </div>
        
        {actions && (
          <div className="flex flex-wrap items-center gap-4">
            {actions}
          </div>
        )}
      </div>
      
      <div 
        className="w-full h-[2px] shadow-[0_2px_10px_rgba(0,0,0,0.3)]"
        style={{ backgroundColor: accentColor }}
      />
    </header>
  );
};

export const PageHeader = SectionHeader;

export const AddTile: React.FC<{ 
  onClick: () => void, 
  label: string, 
  accentColor?: string, 
  className?: string,
  minHeight?: string
}> = ({ 
  onClick, 
  label, 
  accentColor = 'var(--col-blue)', 
  className = '',
  minHeight = 'min-h-[200px]'
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`border-4 border-dashed p-10 flex flex-col items-center justify-center gap-5 transition-all duration-300 group w-full ${minHeight} ${className}`}
      style={{ 
        borderColor: isHovered ? accentColor : 'var(--border-color)',
        // Use color-mix for the hover background
        ['--tile-bg' as any]: isHovered ? accentColor : 'transparent' 
      }}
    >
      <style>{`
        button[style*="--tile-bg"] {
           background-color: color-mix(in srgb, var(--tile-bg) 5%, transparent);
        }
      `}</style>
      
      <Plus 
        size={28} 
        className="transition-transform duration-500 group-hover:rotate-90" 
        style={{ color: isHovered ? accentColor : 'var(--border-color)' }}
      />
      <span 
        className="mono text-[11px] uppercase font-black tracking-widest transition-colors duration-300"
        style={{ color: isHovered ? accentColor : 'var(--text-muted)' }}
      >
        {label}
      </span>
    </button>
  );
};

export const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = 'var(--col-red)' }) => (
  <span 
    className="mono text-[9px] uppercase font-black px-2.5 py-1 border-2" 
    style={{ 
      color: color, 
      borderColor: color, 
      // Opacity via color-mix for border/bg simulation if strictly needed, or just let opacity handle it
      backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`
    }}
  >
    {children}
  </span>
);

export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { accentColor?: string }> = ({ accentColor = 'var(--col-blue)', ...props }) => (
  <div className="relative group w-full max-w-sm">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 opacity-0 group-focus-within:opacity-100 transition-opacity" style={{ backgroundColor: accentColor }} />
    
    <input
      {...props}
      className={`w-full bg-[var(--input-bg)] border-2 border-[var(--border-color)] pl-10 pr-12 py-3 mono text-[11px] uppercase tracking-wider text-[var(--text-main)] focus:outline-none transition-all placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] ${props.className || ''}`}
      style={{ 
        borderColor: props.value ? accentColor : 'var(--border-color)',
        borderLeftWidth: '4px',
        borderLeftColor: accentColor
      }}
    />
    
    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 text-[var(--text-muted)] group-focus-within:text-[var(--text-main)]" style={{ color: props.value ? accentColor : undefined }}>
      <Search size={16} />
    </div>
  </div>
);

export const StatBadge: React.FC<{ 
  stat: StatKey, 
  value: number, 
  bonus?: number, 
  showBonus?: boolean,
  accentColor?: string,
  className?: string 
}> = ({ stat, value, bonus = 0, showBonus = false, accentColor = 'var(--col-yellow)', className = '' }) => {
  const getIcon = () => {
    switch (stat) {
      case 'АТК': return <Sword size={11} />;
      case 'ЗАЩ': return <Shield size={11} />;
      case 'СИЛ': return <Dumbbell size={11} />;
      case 'ЛОВ': return <Wind size={11} />;
      case 'ВЫН': return <Heart size={11} />;
      case 'ИНТ': return <Brain size={11} />;
      case 'МДР': return <Sparkles size={11} />;
      case 'ХАР': return <Users size={11} />;
      case 'УДЧ': return <Clover size={11} />;
      default: return <Zap size={11} />;
    }
  };

  const total = value + bonus;

  return (
    <div 
      className={`px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center gap-2 transition-all hover:border-[var(--border-color-hover)] group/stat ${className}`}
    >
      <span style={{ color: accentColor }} className="group-hover/stat:scale-110 transition-transform">
        {getIcon()}
      </span>
      <span className="mono text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]/90">
        {stat} {showBonus ? value : (total >= 0 ? `+${total}` : total)}
        {showBonus && bonus !== 0 && (
          <span style={{ color: accentColor }} className="ml-1">
            {bonus > 0 ? `+${bonus}` : bonus}
          </span>
        )}
      </span>
    </div>
  );
};
