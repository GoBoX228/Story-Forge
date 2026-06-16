import React, { useState } from 'react';
import { Button, SectionHeader } from './UI';
import { AuthModal } from './AuthModal';
import { BaseCard } from './BaseCard';
import {
  ArrowRight,
  FileDown,
  Map as MapIcon,
  Users,
  Globe,
  PenTool,
  Box
} from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const features = [
    {
      icon: <PenTool size={24} />,
      title: "КОНСТРУКТОР СЦЕНАРИЕВ",
      desc: "Собирайте нелинейные сценарии в graph-редакторе: узлы, переходы, проверки, диалоги, добыча и предпросмотр.",
      color: "var(--col-red)"
    },
    {
      icon: <MapIcon size={24} />,
      title: "РЕДАКТОР КАРТ",
      desc: "Проектируйте тактические карты на сетке, работайте со слоями, тайлами, токенами и наборами ассетов.",
      color: "var(--col-white)"
    },
    {
      icon: <Users size={24} />,
      title: "ПЕРСОНАЖИ И ГРУППЫ",
      desc: "Ведите персонажей, NPC и группы, связывайте их со сценариями, картами, хрониками и ассетами.",
      color: "var(--col-yellow)"
    },
    {
      icon: <Box size={24} />,
      title: "ПРЕДМЕТЫ И АССЕТЫ",
      desc: "Храните предметы, изображения, документы, папки и наборы ассетов для быстрого повторного использования.",
      color: "var(--col-blue)"
    },
    {
      icon: <Globe size={24} />,
      title: "АТЛАС И ХРОНИКИ",
      desc: "Структурируйте мир через хроники, события, места и организации, не ломая самостоятельность материалов.",
      color: "var(--col-teal)"
    },
    {
      icon: <FileDown size={24} />,
      title: "ПУБЛИКАЦИЯ И ЭКСПОРТ",
      desc: "Готовьте материалы к публикации, проверяйте сценарий и экспортируйте его в PDF для подготовки игры.",
      color: "var(--col-purple)"
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] font-sans relative overflow-x-hidden selection:bg-[var(--col-red)] selection:text-white">
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLogin={onLogin} initialMode={authMode} />

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-color)] bg-[var(--bg-main)]/90 backdrop-blur-md animate-appear">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--col-red)] text-white flex items-center justify-center font-bold text-xl mono">К</div>
            <div className="leading-none">
              <div className="text-xl font-black uppercase tracking-tighter text-[var(--text-main)]">КУЗНИЦА</div>
              <div className="text-[10px] mono font-bold uppercase text-[var(--col-red)] tracking-[0.2em]">ИСТОРИЙ</div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Button color="white" inverted onClick={() => openAuth('login')} className="hidden md:flex">
              ВОЙТИ
            </Button>
            <Button color="red" onClick={() => openAuth('register')}>
              РЕГИСТРАЦИЯ
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative pt-40 pb-32 px-6 border-b border-[var(--border-color)] bauhaus-bg">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 space-y-8 animate-slide-in">
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-[var(--col-yellow)] bg-[var(--col-yellow)]/10">
                <span className="w-2 h-2 bg-[var(--col-yellow)] rounded-full animate-pulse" />
                <span className="mono text-[10px] font-black uppercase text-[var(--col-yellow)]">ВЕРСИЯ 1.0 ДОСТУПНА</span>
              </div>
              
              <div className="relative">
                <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] text-[var(--text-main)] glitch-anim" data-text="СОЗДАВАЙ ЛЕГЕНДЫ">
                  СОЗДАВАЙ <br/>
                  <span className="text-[var(--col-red)]">ЛЕГЕНДЫ</span> <br/>
                  КОТОРЫЕ ЖИВУТ
                </h1>
              </div>
              
              <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-xl leading-relaxed mono">
                Рабочее пространство мастера для подготовки настольных RPG:
                сценарии, карты, хроники, материалы и кампании в одном интерфейсе.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" color="red" className="h-16 px-10 text-lg" onClick={() => openAuth('register')}>
                  НАЧАТЬ РАБОТУ <ArrowRight className="ml-2" />
                </Button>
                <Button size="lg" color="white" inverted className="h-16 px-10" onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  УЗНАТЬ БОЛЬШЕ
                </Button>
              </div>
            </div>

            {/* Abstract Graphic */}
            <div className="flex-1 relative flex justify-center animate-appear" style={{ animationDelay: '0.2s' }}>
               <div className="relative w-96 h-96">
                  <div className="absolute inset-0 border-4 border-[var(--col-red)] transform rotate-3 transition-transform duration-1000 hover:rotate-6" />
                  <div className="absolute inset-0 border-4 border-[var(--text-main)] transform -rotate-3 bg-[var(--bg-surface)] flex items-center justify-center overflow-hidden transition-transform duration-1000 hover:-rotate-6 hover:scale-105">
                      <div className="absolute inset-0 bg-[radial-gradient(var(--grid-color)_1px,transparent_1px)] bg-[size:20px_20px]" />
                      <div className="text-[12rem] font-black text-[var(--text-main)]/5 select-none glitch-text">d20</div>
                      <div className="absolute bottom-8 left-8 right-8 space-y-2">
                          <div className="h-2 w-2/3 bg-[var(--col-red)]" />
                          <div className="h-2 w-full bg-[var(--col-blue)]" />
                          <div className="h-2 w-1/2 bg-[var(--col-yellow)]" />
                      </div>
                  </div>
                  <div className="absolute -bottom-6 -right-6 bg-[var(--bg-main)] border border-[var(--border-color)] p-4 shadow-xl hover:translate-x-1 hover:translate-y-1 transition-transform">
                      <div className="mono text-xs font-black text-[var(--text-muted)] uppercase mb-2">Рабочие модули</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mono text-[10px] font-black uppercase text-[var(--text-main)]">
                        <span>Сценарии</span>
                        <span>Карты</span>
                        <span>Атлас</span>
                        <span>Ассеты</span>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* FEATURES GRID */}
      <section id="features" className="py-32 px-6 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto space-y-16">
          <SectionHeader 
            title="ИНСТРУМЕНТАРИЙ" 
            subtitle="ВСЕ НЕОБХОДИМОЕ ДЛЯ ВЕЛИКОЙ ИГРЫ" 
            accentColor="var(--text-main)" 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <BaseCard
                key={i}
                accentColor={feature.color}
                className="min-h-[236px] bg-[var(--bg-main)]"
              >
                <div
                  className="relative mb-8 w-12 h-12 flex items-center justify-center overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] transition-colors group-hover/card:text-black"
                  style={{
                    ['--feature-accent' as any]: feature.color
                  }}
                >
                  <span className="absolute inset-0 opacity-0 transition-opacity group-hover/card:opacity-100 bg-[var(--feature-accent)]" />
                  <span className="relative z-10 text-[var(--feature-accent)] transition-colors group-hover/card:text-black">
                    {feature.icon}
                  </span>
                </div>
                <h3 className="text-xl font-black uppercase mb-4 text-[var(--text-main)]">
                  {feature.title}
                </h3>
                <p className="text-[var(--text-muted)] mono text-xs leading-relaxed max-w-sm">
                  {feature.desc}
                </p>
              </BaseCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 px-6 border-t border-[var(--border-color)] bg-[var(--bg-main)] relative overflow-hidden">
         <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,var(--col-red)_25%,transparent_25%,transparent_50%,var(--col-red)_50%,var(--col-red)_75%,transparent_75%,transparent)] bg-[size:60px_60px] opacity-20" />
         </div>
         
         <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-[var(--text-main)] glitch-anim" data-text="ТВОЙ МИР ЖДЕТ СОЗДАТЕЛЯ">
              ТВОЙ МИР <br/> ЖДЕТ СОЗДАТЕЛЯ
            </h2>
            <p className="text-xl mono text-[var(--text-muted)]">
              Соберите кампанию, подготовьте сценарии, разложите события по хронике
              и держите все материалы под рукой.
            </p>
            <Button size="lg" color="red" className="h-20 px-12 text-xl" onClick={() => openAuth('register')}>
               СОЗДАТЬ АККАУНТ
            </Button>
         </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-surface)] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[var(--text-muted)] text-[var(--bg-main)] flex items-center justify-center font-bold text-xs mono">К</div>
              <span className="mono text-[10px] font-bold uppercase text-[var(--text-muted)]">© 2026 КУЗНИЦА ИСТОРИЙ</span>
           </div>
           <span className="mono text-[10px] font-bold uppercase text-[var(--text-muted)]">
             Рабочее пространство мастера настольных RPG
           </span>
        </div>
      </footer>
    </div>
  );
};






