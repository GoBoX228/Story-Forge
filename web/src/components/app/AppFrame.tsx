import React, { Suspense } from 'react';
import Sidebar from '../Sidebar';
import { AdminBroadcastItem } from '../../types';
import { AppView } from '../../appTypes';
import { LoadingSpinner } from './LoadingSpinner';

const BROADCAST_LABELS: Record<AdminBroadcastItem['type'], string> = {
  info: 'ИНФО',
  warning: 'ПРЕДУПРЕЖДЕНИЕ',
  critical: 'КРИТИЧЕСКОЕ'
};

const getBroadcastAccent = (type: AdminBroadcastItem['type']): string => {
  if (type === 'critical') return 'var(--col-red)';
  if (type === 'warning') return 'var(--col-yellow)';
  return 'var(--col-blue)';
};

const formatBroadcastTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('ru-RU');
};

interface AppFrameProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  interfaceScale: number;
  broadcasts: AdminBroadcastItem[];
  isAdmin: boolean;
  modal?: React.ReactNode;
  children: React.ReactNode;
  onLogout: () => void;
  onClearNotifications: () => void;
}

export const AppFrame: React.FC<AppFrameProps> = ({
  activeView,
  setActiveView,
  showNotifications,
  setShowNotifications,
  interfaceScale,
  broadcasts,
  isAdmin,
  modal,
  children,
  onLogout,
  onClearNotifications
}) => (
  <div className="flex h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] selection:bg-[var(--col-red)] selection:text-white overflow-hidden relative">
    <Sidebar
      activeView={activeView}
      setActiveView={setActiveView}
      showNotifications={showNotifications}
      setShowNotifications={setShowNotifications}
      onLogout={onLogout}
      isAdmin={isAdmin}
    />

    <main
      className="flex-1 relative flex flex-col h-full overflow-hidden transition-colors duration-300"
      style={{ zoom: interfaceScale }}
    >
      {showNotifications && (
        <div className="absolute top-6 left-6 w-96 z-[200] perspective-1000">
          <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-red)] shadow-[10px_10px_0px_rgba(var(--col-red),0.2)] animate-appear origin-top-left">
            <div className="flex justify-between items-center p-4 border-b border-[var(--col-red)] bg-[var(--bg-main)] relative overflow-hidden">
              <div className="relative flex items-center gap-3">
                <div className="w-2 h-2 bg-[var(--col-red)] animate-pulse" />
                <span className="mono text-[10px] uppercase font-black tracking-[0.2em] text-[var(--col-red)]">
                  СИСТЕМНЫЕ УВЕДОМЛЕНИЯ
                </span>
              </div>
              <button
                type="button"
                onClick={onClearNotifications}
                disabled={broadcasts.length === 0}
                className="mono text-[9px] uppercase font-black tracking-[0.15em] border border-[var(--col-red)] px-3 py-1 text-[var(--col-red)] transition-all hover:bg-[var(--col-red)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--col-red)]"
              >
                ОЧИСТИТЬ
              </button>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
              {broadcasts.length === 0 && (
                <p className="text-[11px] text-[var(--text-muted)]">УВЕДОМЛЕНИЙ НЕТ.</p>
              )}
              {broadcasts.map((item) => (
                <div key={item.id} className="border border-[var(--border-color)] p-3 bg-[var(--bg-main)]">
                  <div className="flex justify-between items-center">
                    <span
                      className="mono text-[9px] uppercase font-black"
                      style={{ color: getBroadcastAccent(item.type) }}
                    >
                      {BROADCAST_LABELS[item.type]}
                    </span>
                    <span className="mono text-[9px] text-[var(--text-muted)]">
                      {formatBroadcastTime(item.created_at)}
                    </span>
                  </div>
                  <p className="mono text-[10px] text-[var(--text-main)] mt-2">{item.message}</p>
                  <p className="mono text-[8px] text-[var(--text-muted)] mt-2">{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      {modal}
    </main>
  </div>
);
