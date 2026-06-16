import { Loader2 } from 'lucide-react';

export const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center bg-[var(--bg-main)] animate-fade-in">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="animate-spin text-[var(--col-red)]" size={48} />
      <span className="mono text-[10px] uppercase font-black text-[var(--text-muted)] tracking-widest animate-pulse">
        ЗАГРУЗКА МОДУЛЯ...
      </span>
    </div>
  </div>
);
