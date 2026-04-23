import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BaseCard } from './BaseCard';
import { Badge, Button, SearchInput, Select, TextArea } from './UI';
import {
  createAdminBroadcast,
  deleteAdminContent,
  getAdminBroadcasts,
  getAdminContent,
  getAdminLogs,
  getAdminOverview,
  getAdminReports,
  getAdminUsers,
  updateAdminReport,
  updateAdminUser,
} from '../lib/admin';
import {
  AdminAuditLogItem,
  AdminBroadcastItem,
  AdminContentItem,
  AdminOverview,
  AdminReportItem,
  AdminUserItem,
  UserProfile,
  UserRole,
  UserStatus,
} from '../types';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Database,
  Download,
  FileText,
  HardDrive,
  Lock,
  Map as MapIcon,
  Megaphone,
  Package,
  Radio,
  RefreshCw,
  Server,
  Shield,
  Terminal,
  Trash2,
  Unlock,
  Users,
  XCircle,
} from 'lucide-react';

type TabId = 'DASHBOARD' | 'USERS' | 'REPORTS' | 'BROADCAST' | 'CONTENT';
type NoticeType = 'SUCCESS' | 'ERROR' | 'WARN';

interface AdminViewProps {
  currentUser: UserProfile | null;
  onContentDeleted?: (item: { type: AdminContentItem['type']; id: number }) => void;
}

interface UserDraft {
  role: UserRole;
  status: UserStatus;
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'var(--col-red)',
  moderator: 'var(--col-yellow)',
  user: 'var(--col-blue)',
};

const STATUS_COLORS: Record<UserStatus, string> = {
  active: 'var(--col-teal)',
  muted: 'var(--col-yellow)',
  banned: 'var(--col-red)',
};

const NOTICE_COLORS: Record<NoticeType, string> = {
  SUCCESS: 'var(--col-teal)',
  ERROR: 'var(--col-red)',
  WARN: 'var(--col-yellow)',
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'АДМИН',
  moderator: 'МОДЕРАТОР',
  user: 'ПОЛЬЗОВАТЕЛЬ',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'АКТИВЕН',
  muted: 'МУТ',
  banned: 'БАН',
};

const REPORT_STATUS_LABELS: Record<AdminReportItem['status'], string> = {
  open: 'ОТКРЫТА',
  resolved: 'РЕШЕНА',
  dismissed: 'ОТКЛОНЕНА',
};

const CONTENT_LABELS: Record<AdminContentItem['type'], string> = {
  scenario: 'СЦЕНАРИЙ',
  map: 'КАРТА',
  character: 'КАРТА ПЕРСОНАЖА',
  item: 'ПРЕДМЕТ',
  campaign: 'КАМПАНИЯ',
};

const REPORT_TARGET_LABELS: Record<AdminReportItem['target_type'], string> = {
  user: 'ПОЛЬЗОВАТЕЛЬ',
  scenario: 'СЦЕНАРИЙ',
  map: 'КАРТА',
  character: 'ПЕРСОНАЖ',
  item: 'ПРЕДМЕТ',
  campaign: 'КАМПАНИЯ',
};

const BROADCAST_LABELS: Record<AdminBroadcastItem['type'], string> = {
  info: 'ИНФО',
  warning: 'ПРЕДУПРЕЖДЕНИЕ',
  critical: 'КРИТИЧЕСКОЕ',
};

const contentTypeColor = (type: AdminContentItem['type']): string => {
  switch (type) {
    case 'scenario':
      return 'var(--col-red)';
    case 'map':
      return 'var(--col-white)';
    case 'character':
      return 'var(--col-yellow)';
    case 'item':
      return 'var(--col-blue)';
    default:
      return 'var(--col-blue)';
  }
};

const contentTypeIcon = (type: AdminContentItem['type']): React.ReactNode => {
  switch (type) {
    case 'scenario':
      return <FileText size={12} />;
    case 'map':
      return <MapIcon size={12} />;
    case 'character':
      return <Users size={12} />;
    case 'item':
      return <Package size={12} />;
    default:
      return <Shield size={12} />;
  }
};

const parseError = (value: unknown, fallback: string): string => {
  if (value && typeof value === 'object' && 'message' in value) {
    const message = (value as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
};

const formatDate = (raw: string | null | undefined): string => {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
};

const downloadData = (filename: string, mime: string, content: string): void => {
  const link = document.createElement('a');
  link.href = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
  link.download = filename;
  link.click();
};

export const AdminView: React.FC<AdminViewProps> = ({ currentUser, onContentDeleted }) => {
  const [activeTab, setActiveTab] = useState<TabId>('DASHBOARD');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [content, setContent] = useState<AdminContentItem[]>([]);
  const [logs, setLogs] = useState<AdminAuditLogItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<AdminBroadcastItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ message: string; type: NoticeType } | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportStatus, setReportStatus] = useState<'open' | 'resolved' | 'dismissed' | ''>('open');
  const [contentSearch, setContentSearch] = useState('');
  const [contentType, setContentType] = useState<AdminContentItem['type'] | ''>('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'critical'>('info');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({});
  const [serverClock, setServerClock] = useState(() => new Date());

  const showNotice = useCallback((message: string, type: NoticeType = 'SUCCESS') => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 2800);
  }, []);

  const loadOverview = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminOverview();
      setOverview(data);
      setLogs(data.logs ?? []);
      setBroadcasts(data.broadcasts ?? []);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить панель администратора'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const data = await getAdminLogs();
      setLogs(data);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить журнал'));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminUsers(userSearch);
      setUsers(data);
      const drafts = data.reduce<Record<string, UserDraft>>((acc, user) => {
        acc[String(user.id)] = { role: user.role, status: user.status };
        return acc;
      }, {});
      setUserDrafts(drafts);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить пользователей'));
    } finally {
      setIsLoading(false);
    }
  }, [userSearch]);

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminReports(reportStatus, reportSearch);
      setReports(data);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить жалобы'));
    } finally {
      setIsLoading(false);
    }
  }, [reportSearch, reportStatus]);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAdminContent({ type: contentType, search: contentSearch });
      setContent(data);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить реестр'));
    } finally {
      setIsLoading(false);
    }
  }, [contentSearch, contentType]);

  const loadBroadcasts = useCallback(async () => {
    try {
      const data = await getAdminBroadcasts();
      setBroadcasts(data);
    } catch (value) {
      setError(parseError(value, 'Не удалось загрузить рассылки'));
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setServerClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'DASHBOARD') {
      void loadOverview();
      return;
    }
    if (activeTab === 'USERS') {
      void loadUsers();
      return;
    }
    if (activeTab === 'REPORTS') {
      void loadReports();
      return;
    }
    if (activeTab === 'BROADCAST') {
      void loadBroadcasts();
      return;
    }
    if (activeTab === 'CONTENT') {
      void loadContent();
    }
  }, [activeTab, loadBroadcasts, loadContent, loadOverview, loadReports, loadUsers]);

  const applyUserUpdate = async (target: AdminUserItem) => {
    const draft = userDrafts[String(target.id)];
    if (!draft) return;
    if (draft.role === target.role && draft.status === target.status) return;

    if (currentUser?.id === String(target.id) && draft.status === 'banned') {
      showNotice('Нельзя забанить собственный аккаунт', 'ERROR');
      return;
    }

    setIsProcessing(true);
    setError('');
    try {
      const updated = await updateAdminUser(target.id, draft);
      setUsers((prev) => prev.map((item) => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item)));
      showNotice(`Пользователь #${target.id} обновлен`);
      await loadOverview();
    } catch (value) {
      setError(parseError(value, 'Не удалось обновить пользователя'));
    } finally {
      setIsProcessing(false);
    }
  };

  const updateReportStatus = async (
    report: AdminReportItem,
    status: 'resolved' | 'dismissed',
    banTargetUser = false
  ) => {
    setIsProcessing(true);
    setError('');
    try {
      const updated = await updateAdminReport(report.id, {
        status,
        ban_target_user: banTargetUser,
      });
      setReports((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showNotice(status === 'resolved' ? `Жалоба #${report.id} решена` : `Жалоба #${report.id} отклонена`);
      if (banTargetUser) {
        await loadUsers();
      }
      await loadOverview();
    } catch (value) {
      setError(parseError(value, 'Не удалось обновить жалобу'));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendBroadcast = async () => {
    const trimmed = broadcastMessage.trim();
    if (!trimmed) return;

    setIsProcessing(true);
    setError('');
    try {
      const created = await createAdminBroadcast({ type: broadcastType, message: trimmed });
      setBroadcasts((prev) => [created, ...prev]);
      setBroadcastMessage('');
      showNotice('Сообщение отправлено');
      await loadOverview();
    } catch (value) {
      setError(parseError(value, 'Не удалось отправить сообщение'));
    } finally {
      setIsProcessing(false);
    }
  };

  const removeContentItem = async (item: AdminContentItem) => {
    const confirmed = window.confirm(`Удалить ${CONTENT_LABELS[item.type]} #${item.id} (${item.title})?`);
    if (!confirmed) return;

    setIsProcessing(true);
    setError('');
    try {
      await deleteAdminContent(item.type, item.id);
      setContent((prev) => prev.filter((entry) => !(entry.type === item.type && entry.id === item.id)));
      onContentDeleted?.({ type: item.type, id: item.id });
      showNotice(`${CONTENT_LABELS[item.type]} #${item.id} удален`, 'WARN');
      await loadOverview();
    } catch (value) {
      setError(parseError(value, 'Не удалось удалить контент'));
    } finally {
      setIsProcessing(false);
    }
  };

  const exportUsersCsv = async () => {
    try {
      const source = users.length > 0 ? users : await getAdminUsers();
      const csvRows = [
        'id,name,email,role,status,reports_count,created_at',
        ...source.map((item) =>
          [item.id, item.name, item.email, item.role, item.status, item.reports_count, formatDate(item.created_at)].join(',')
        ),
      ];
      downloadData(`users-${Date.now()}.csv`, 'text/csv', csvRows.join('\n'));
      showNotice('CSV выгружен');
    } catch (value) {
      setError(parseError(value, 'Не удалось выгрузить пользователей'));
    }
  };

  const createSystemDump = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      overview,
      users,
      reports,
      content,
      logs,
      broadcasts,
    };
    downloadData(`storyforge-admin-dump-${Date.now()}.json`, 'application/json', JSON.stringify(payload, null, 2));
    showNotice('Снимок экспортирован');
  };

  const userRows = useMemo(() => {
    return users.map((user) => {
      const draft = userDrafts[String(user.id)] ?? { role: user.role, status: user.status };
      const changed = draft.role !== user.role || draft.status !== user.status;
      const isSelf = currentUser?.id === String(user.id);
      return { user, draft, changed, isSelf };
    });
  }, [currentUser?.id, userDrafts, users]);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode }> = [
    { id: 'DASHBOARD', label: 'ОБЗОР', icon: <Activity size={14} /> },
    { id: 'USERS', label: 'ПОЛЬЗОВАТЕЛИ', icon: <Users size={14} /> },
    { id: 'REPORTS', label: 'ТРИБУНАЛ', icon: <AlertTriangle size={14} /> },
    { id: 'BROADCAST', label: 'ВЕЩАНИЕ', icon: <Radio size={14} /> },
    { id: 'CONTENT', label: 'РЕЕСТР', icon: <FileText size={14} /> },
  ];

  return (
    <div className="h-full w-full bg-[var(--bg-main)] flex flex-col overflow-hidden relative">
      {notice && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[999] animate-appear">
          <div
            className="px-5 py-3 border-2 shadow-[0_10px_30px_rgba(0,0,0,0.65)] flex items-center gap-3 min-w-[320px]"
            style={{
              borderColor: NOTICE_COLORS[notice.type],
              backgroundColor: 'var(--bg-surface)',
              color: NOTICE_COLORS[notice.type],
            }}
          >
            {notice.type === 'SUCCESS' && <CheckCircle size={18} />}
            {notice.type === 'WARN' && <AlertTriangle size={18} />}
            {notice.type === 'ERROR' && <XCircle size={18} />}
            <span className="mono text-[10px] uppercase font-black tracking-widest">{notice.message}</span>
          </div>
        </div>
      )}

      <div className="p-8 pb-0 shrink-0 bg-[var(--bg-main)] relative z-20">
        <div className="flex justify-between items-start border-b-2 border-[var(--col-red)] pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-[var(--text-main)] flex items-center gap-4">
              <Shield size={32} className="text-[var(--col-red)]" />
              ЯДРО СИСТЕМЫ
            </h1>
            <p className="mono text-[10px] font-bold uppercase text-[var(--col-red)] tracking-[0.4em] mt-1 pl-12">
              ПАНЕЛЬ АДМИНИСТРАТОРА v2
            </p>
          </div>
          <div className="text-right hidden md:block">
            <div className="mono text-[10px] text-[var(--text-muted)] uppercase">ВРЕМЯ СЕРВЕРА</div>
            <div className="text-xl font-black text-[var(--text-main)] mono">{serverClock.toLocaleTimeString()}</div>
          </div>
        </div>
        <div className="flex gap-1 border-b-2 border-[var(--border-color)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'px-6 py-3 border-t-2 border-x-2 mono text-[10px] font-black uppercase tracking-widest',
                'transition-all -mb-[2px] flex items-center gap-2',
                activeTab === tab.id
                  ? 'bg-[var(--col-red)] border-[var(--col-red)] text-white'
                  : 'bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-color)]',
              ].join(' ')}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8 bauhaus-bg relative z-10">
        <div className="max-w-7xl mx-auto space-y-4 pb-20">
          {isLoading && (
            <div className="mono text-[10px] uppercase text-[var(--text-muted)] inline-flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin" />
              ЗАГРУЗКА
            </div>
          )}
          {error && (
            <div className="p-3 border border-[var(--col-red)] bg-[var(--col-red)]/10 mono text-[10px] uppercase font-black text-[var(--col-red)]">
              {error}
            </div>
          )}

          {activeTab === 'DASHBOARD' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-teal)] p-4 flex items-center justify-between">
                  <div>
                    <div className="mono text-[9px] uppercase font-black text-[var(--col-teal)] mb-1">СТАТУС СЕРВЕРА</div>
                    <div className="text-xl font-black text-[var(--text-main)]">ОНЛАЙН</div>
                  </div>
                  <Server className="text-[var(--col-teal)] animate-pulse" />
                </div>
                <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-blue)] p-4 flex items-center justify-between">
                  <div>
                    <div className="mono text-[9px] uppercase font-black text-[var(--col-blue)] mb-1">ПОЛЬЗОВАТЕЛИ</div>
                    <div className="text-xl font-black text-[var(--text-main)]">{overview?.stats.users_total ?? 0}</div>
                  </div>
                  <Users className="text-[var(--col-blue)]" />
                </div>
                <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-red)] p-4 flex items-center justify-between">
                  <div>
                    <div className="mono text-[9px] uppercase font-black text-[var(--col-red)] mb-1">ЖАЛОБЫ</div>
                    <div className="text-xl font-black text-[var(--text-main)]">{overview?.stats.reports_open ?? 0}</div>
                  </div>
                  <AlertTriangle className="text-[var(--col-red)]" />
                </div>
                <div className="bg-[var(--bg-surface)] border-2 border-[var(--col-purple)] p-4 flex items-center justify-between">
                  <div>
                    <div className="mono text-[9px] uppercase font-black text-[var(--col-purple)] mb-1">БАЗА ДАННЫХ</div>
                    <div className="text-xl font-black text-[var(--text-main)]">
                      {overview
                        ? overview.stats.scenarios_total +
                          overview.stats.maps_total +
                          overview.stats.characters_total +
                          overview.stats.items_total
                        : 0}
                    </div>
                  </div>
                  <Database className="text-[var(--col-purple)]" />
                </div>
              </div>

              <div className="lg:col-span-2">
                <BaseCard title="СИСТЕМНЫЙ ТЕРМИНАЛ" accentColor="var(--col-grey)" className="!h-auto">
                  <div className="bg-black border border-[var(--border-color)] p-4 font-mono text-[10px] h-96 overflow-y-auto custom-scrollbar">
                    {logs.length === 0 && <div className="text-[var(--text-muted)]">Журнал пуст.</div>}
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="mb-2 border-b border-[var(--border-color)]/20 pb-2 last:border-0 hover:bg-[var(--bg-surface)] transition-colors"
                      >
                        <span className="text-[var(--col-blue)] mr-2">[{formatDate(log.created_at)}]</span>
                        <span className="text-[var(--col-yellow)] mr-2 font-bold">{log.action}</span>
                        <span className="text-[var(--text-muted)] mr-2">@{log.user?.name ?? 'system'}</span>
                        <span className="text-[var(--text-main)]">{log.details ?? 'no details'}</span>
                      </div>
                    ))}
                  </div>
                </BaseCard>
              </div>

              <div className="space-y-6">
                <BaseCard title="БЫСТРЫЕ ДЕЙСТВИЯ" accentColor="var(--col-red)" className="!h-auto">
                  <div className="space-y-3 pb-2">
                    <Button
                      className="w-full justify-start"
                      color="red"
                      inverted
                      onClick={() => showNotice('РЕЖИМ ЧП АКТИВИРОВАН', 'WARN')}
                    >
                      <Shield size={16} className="mr-2" />
                      РЕЖИМ ЧП
                    </Button>
                    <Button
                      className="w-full justify-start"
                      color="yellow"
                      inverted
                      onClick={() => showNotice('РЕГИСТРАЦИИ ЗАМОРОЖЕНЫ', 'WARN')}
                    >
                      <Lock size={16} className="mr-2" />
                      ЗАМОРОЗКА РЕГИСТРАЦИЙ
                    </Button>
                    <Button className="w-full justify-start" color="purple" inverted onClick={createSystemDump}>
                      <HardDrive size={16} className="mr-2" />
                      СОЗДАТЬ БЭКАП
                    </Button>
                    <Button
                      className="w-full justify-start"
                      color="grey"
                      inverted
                      onClick={() => showNotice('КЭШ ОЧИЩЕН', 'SUCCESS')}
                    >
                      <Terminal size={16} className="mr-2" />
                      ОЧИСТИТЬ КЭШ
                    </Button>
                  </div>
                </BaseCard>

                <BaseCard title="СВОДКА" accentColor="var(--col-blue)" className="!h-auto">
                  <div className="mono text-[10px] uppercase space-y-2 pb-2">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Сценарии</span>
                      <span className="font-black">{overview?.stats.scenarios_total ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Карты</span>
                      <span className="font-black">{overview?.stats.maps_total ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Персонажи</span>
                      <span className="font-black">{overview?.stats.characters_total ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Предметы</span>
                      <span className="font-black">{overview?.stats.items_total ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Кампании</span>
                      <span className="font-black">{overview?.stats.campaigns_total ?? 0}</span>
                    </div>
                  </div>
                </BaseCard>
              </div>
            </div>
          )}

          {activeTab === 'USERS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex gap-4">
                <SearchInput
                  placeholder="ПОИСК ПО ИМЕНИ ИЛИ ПОЧТЕ"
                  accentColor="var(--col-red)"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                />
                <Button color="grey" inverted onClick={() => void loadUsers()}>
                  <RefreshCw size={14} /> ОБНОВИТЬ
                </Button>
                <Button color="blue" onClick={() => void exportUsersCsv()}>
                  <Download size={14} /> CSV
                </Button>
              </div>

              <div className="border-2 border-[var(--border-color)] bg-[var(--bg-surface)]">
                <div className="grid grid-cols-12 gap-4 p-4 border-b-2 border-[var(--border-color)] bg-[var(--bg-main)] mono text-[10px] font-black uppercase text-[var(--text-muted)]">
                  <div className="col-span-3">ПОЛЬЗОВАТЕЛЬ</div>
                  <div className="col-span-3">ПОЧТА</div>
                  <div className="col-span-2">РОЛЬ</div>
                  <div className="col-span-2">СТАТУС</div>
                  <div className="col-span-2 text-right">ДЕЙСТВИЯ</div>
                </div>
                <div className="divide-y divide-[var(--border-color)]">
                  {userRows.map(({ user, draft, changed, isSelf }) => (
                    <div key={user.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-[var(--bg-main)] transition-colors">
                      <div className="col-span-3 min-w-0">
                        <div className="mono text-[11px] font-black uppercase truncate">{user.name}</div>
                        <div className="mono text-[9px] text-[var(--text-muted)] truncate">
                          ID: {user.id} | Жалобы: {user.reports_count}
                        </div>
                      </div>
                      <div className="col-span-3 mono text-[10px] text-[var(--text-muted)] truncate">{user.email}</div>
                      <div className="col-span-2">
                        <Select
                          value={draft.role}
                          onChange={(value) =>
                            setUserDrafts((prev) => ({
                              ...prev,
                              [String(user.id)]: { ...draft, role: value as UserRole },
                            }))
                          }
                          options={[
                            { value: 'user', label: ROLE_LABELS.user },
                            { value: 'moderator', label: ROLE_LABELS.moderator },
                            { value: 'admin', label: ROLE_LABELS.admin },
                          ]}
                          accentColor={ROLE_COLORS[draft.role]}
                        />
                      </div>
                      <div className="col-span-2">
                        <Select
                          value={draft.status}
                          onChange={(value) =>
                            setUserDrafts((prev) => ({
                              ...prev,
                              [String(user.id)]: { ...draft, status: value as UserStatus },
                            }))
                          }
                          options={[
                            { value: 'active', label: STATUS_LABELS.active },
                            { value: 'muted', label: STATUS_LABELS.muted },
                            { value: 'banned', label: STATUS_LABELS.banned },
                          ]}
                          accentColor={STATUS_COLORS[draft.status]}
                        />
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Badge color={STATUS_COLORS[user.status]}>{STATUS_LABELS[user.status]}</Badge>
                        <button
                          onClick={() => void applyUserUpdate(user)}
                          disabled={!changed || isProcessing || (isSelf && draft.status === 'banned')}
                          className={[
                            'p-2 border border-[var(--border-color)] transition-all',
                            'hover:border-[var(--col-teal)] hover:bg-[var(--col-teal)] hover:text-white',
                            'disabled:opacity-30 disabled:cursor-not-allowed',
                          ].join(' ')}
                        >
                          {draft.status === 'banned' ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {userRows.length === 0 && (
                    <div className="p-6 mono text-[10px] uppercase text-[var(--text-muted)]">ПОЛЬЗОВАТЕЛИ НЕ НАЙДЕНЫ</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'REPORTS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap gap-4">
                <SearchInput
                  placeholder="ПОИСК ЖАЛОБ"
                  accentColor="var(--col-red)"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                />
                <Select
                  value={reportStatus}
                  onChange={(value) => setReportStatus(value as 'open' | 'resolved' | 'dismissed' | '')}
                  options={[
                    { value: 'open', label: 'ОТКРЫТЫЕ' },
                    { value: 'resolved', label: 'РЕШЕННЫЕ' },
                    { value: 'dismissed', label: 'ОТКЛОНЕННЫЕ' },
                    { value: '', label: 'ВСЕ' },
                  ]}
                  className="max-w-[180px]"
                  accentColor="var(--col-yellow)"
                />
                <Button color="grey" inverted onClick={() => void loadReports()}>
                  <RefreshCw size={14} /> ОБНОВИТЬ
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className={[
                      'border-l-4 p-5 bg-[var(--bg-surface)] border-y border-r border-[var(--border-color)]',
                      report.status === 'open' ? 'border-l-[var(--col-red)]' : 'border-l-[var(--col-teal)] opacity-80',
                    ].join(' ')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <Badge color={report.status === 'open' ? 'var(--col-red)' : 'var(--col-teal)'}>
                          {REPORT_STATUS_LABELS[report.status]}
                        </Badge>
                        <span className="mono text-[9px] text-[var(--text-muted)]">#{report.id}</span>
                      </div>
                      <span className="mono text-[9px] text-[var(--text-muted)]">{formatDate(report.created_at)}</span>
                    </div>

                    <div className="mono text-[10px] uppercase font-black text-[var(--text-main)]">
                      ЦЕЛЬ: {REPORT_TARGET_LABELS[report.target_type]} #{report.target_id}
                    </div>
                    <p className="mono text-[10px] text-[var(--text-muted)] mt-3 leading-relaxed">
                      {report.description ?? 'Описание отсутствует'}
                    </p>
                    <div className="mono text-[9px] text-[var(--text-muted)] mt-3 uppercase">
                      Заявитель: {report.reporter?.name ?? 'Неизвестно'}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        color="red"
                        className="flex-1"
                        onClick={() => void updateReportStatus(report, 'resolved', report.target_type === 'user')}
                        disabled={isProcessing || report.status !== 'open'}
                      >
                        <Lock size={14} /> РЕШИТЬ
                      </Button>
                      <Button
                        size="sm"
                        color="grey"
                        inverted
                        className="flex-1"
                        onClick={() => void updateReportStatus(report, 'dismissed')}
                        disabled={isProcessing || report.status !== 'open'}
                      >
                        <CheckCircle size={14} /> ОТКЛОНИТЬ
                      </Button>
                    </div>
                  </div>
                ))}
                {reports.length === 0 && (
                  <div className="mono text-[10px] uppercase text-[var(--text-muted)]">ЖАЛОБЫ НЕ НАЙДЕНЫ</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'BROADCAST' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in">
              <div className="xl:col-span-2">
                <BaseCard title="СИСТЕМА ВЕЩАНИЯ" accentColor="var(--col-red)" className="!h-auto">
                  <div className="space-y-5 pb-2">
                    <div className="p-4 bg-[var(--col-red)]/10 border border-[var(--col-red)] flex items-start gap-3">
                      <Radio className="text-[var(--col-red)] mt-0.5" size={20} />
                      <p className="mono text-[10px] text-[var(--text-muted)] uppercase leading-relaxed">
                        Сообщение будет доставлено всем активным пользователям и сохранено в журнале админа.
                      </p>
                    </div>
                    <Select
                      value={broadcastType}
                      onChange={(value) => setBroadcastType(value as 'info' | 'warning' | 'critical')}
                      options={[
                        { value: 'info', label: BROADCAST_LABELS.info },
                        { value: 'warning', label: BROADCAST_LABELS.warning },
                        { value: 'critical', label: BROADCAST_LABELS.critical },
                      ]}
                      accentColor={
                        broadcastType === 'critical'
                          ? 'var(--col-red)'
                          : broadcastType === 'warning'
                          ? 'var(--col-yellow)'
                          : 'var(--col-blue)'
                      }
                    />
                    <TextArea
                      value={broadcastMessage}
                      onChange={(event) => setBroadcastMessage(event.target.value)}
                      placeholder="ВВЕДИТЕ ТЕКСТ УВЕДОМЛЕНИЯ..."
                      accentColor="var(--col-red)"
                      className="min-h-[160px]"
                    />
                    <Button color="red" size="lg" onClick={() => void sendBroadcast()} disabled={isProcessing || !broadcastMessage.trim()}>
                      <Megaphone size={18} /> ТРАНСЛИРОВАТЬ
                    </Button>
                  </div>
                </BaseCard>
              </div>

              <div>
                <BaseCard title="ПОСЛЕДНИЕ РАССЫЛКИ" accentColor="var(--col-yellow)" className="!h-auto">
                  <div className="space-y-3 pb-2">
                    {broadcasts.slice(0, 8).map((item) => (
                      <div key={item.id} className="p-3 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="flex justify-between items-center mb-2">
                          <Badge color={item.type === 'critical' ? 'var(--col-red)' : item.type === 'warning' ? 'var(--col-yellow)' : 'var(--col-blue)'}>
                            {BROADCAST_LABELS[item.type]}
                          </Badge>
                          <span className="mono text-[9px] text-[var(--text-muted)]">#{item.id}</span>
                        </div>
                        <p className="mono text-[10px] text-[var(--text-main)] leading-relaxed">{item.message}</p>
                        <p className="mono text-[9px] text-[var(--text-muted)] mt-2">
                          {item.author} | {formatDate(item.created_at)}
                        </p>
                      </div>
                    ))}
                    {broadcasts.length === 0 && (
                      <div className="mono text-[10px] uppercase text-[var(--text-muted)]">СООБЩЕНИЙ НЕТ</div>
                    )}
                  </div>
                </BaseCard>
              </div>
            </div>
          )}

          {activeTab === 'CONTENT' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-wrap gap-4 items-center">
                <SearchInput
                  placeholder="ПОИСК КОНТЕНТА"
                  accentColor="var(--col-purple)"
                  value={contentSearch}
                  onChange={(event) => setContentSearch(event.target.value)}
                />
                <Select
                  value={contentType}
                  onChange={(value) => setContentType(value as AdminContentItem['type'] | '')}
                  options={[
                    { value: '', label: 'ВСЕ ТИПЫ' },
                    { value: 'scenario', label: 'СЦЕНАРИИ' },
                    { value: 'map', label: 'КАРТЫ' },
                    { value: 'character', label: 'КАРТЫ ПЕРСОНАЖЕЙ' },
                    { value: 'item', label: 'ПРЕДМЕТЫ' },
                    { value: 'campaign', label: 'КАМПАНИИ' },
                  ]}
                  className="max-w-[220px]"
                  accentColor="var(--col-purple)"
                />
                <Button color="grey" inverted onClick={() => void loadContent()}>
                  <RefreshCw size={14} /> ОБНОВИТЬ
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {content.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="bg-[var(--bg-surface)] border-2 border-[var(--border-color)] p-5 transition-all hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-3">
                      <Badge color={contentTypeColor(item.type)}>
                        {CONTENT_LABELS[item.type]}
                      </Badge>
                      <button
                        onClick={() => void removeContentItem(item)}
                        disabled={isProcessing}
                        className="p-2 border border-[var(--border-color)] hover:border-[var(--col-red)] hover:text-[var(--col-red)] disabled:opacity-40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <h3 className="mono text-sm font-black uppercase text-[var(--text-main)] mb-2 truncate">{item.title}</h3>
                    <p className="mono text-[10px] text-[var(--text-muted)] uppercase mb-3">АВТОР: {item.author}</p>
                    <div className="flex items-center gap-3 text-[var(--text-muted)] mono text-[10px] font-bold border-y border-[var(--border-color)] py-2 mb-3">
                      <span className="flex items-center gap-1">
                        {contentTypeIcon(item.type)}
                        {CONTENT_LABELS[item.type]}
                      </span>
                      <span>ОТКРЫТЫХ ЖАЛОБ: {item.reports_open}</span>
                    </div>
                    <p className="mono text-[9px] text-[var(--text-muted)]">СОЗДАНО: {formatDate(item.created_at)}</p>
                  </div>
                ))}
                {content.length === 0 && (
                  <div className="mono text-[10px] uppercase text-[var(--text-muted)]">КОНТЕНТ НЕ НАЙДЕН</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

