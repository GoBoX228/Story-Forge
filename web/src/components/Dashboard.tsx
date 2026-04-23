import React, { useMemo } from 'react';
import { ICONS, COLORS } from '../constants';
import { BaseCard } from './BaseCard';
import { AddTile, Badge, Button } from './UI';
import { Campaign, Character, MapData, Scenario } from '../types';

interface DashboardProps {
  onOpenEditor: (view: string) => void;
  onOpenScenarioEditor: (scenarioId?: string) => void;
  onOpenMapEditor: (mapId?: string) => void;
  onOpenCampaignEditor: (campaignId?: string) => void;
  scenarios: Scenario[];
  maps: MapData[];
  characters: Character[];
  campaigns: Campaign[];
}

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '---';
  return parsed.toLocaleDateString('ru-RU');
};

const toTimestamp = (value?: string | null): number => {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
};

const Dashboard: React.FC<DashboardProps> = ({
  onOpenEditor,
  onOpenScenarioEditor,
  onOpenMapEditor,
  onOpenCampaignEditor,
  scenarios,
  maps,
  campaigns,
}) => {
  const recentScenarios = useMemo(
    () =>
      [...scenarios]
        .sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt))
        )
        .slice(0, 2),
    [scenarios]
  );

  const recentMaps = useMemo(
    () =>
      [...maps]
        .sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt))
        )
        .slice(0, 4),
    [maps]
  );

  const recentCampaigns = useMemo(
    () =>
      [...campaigns]
        .sort(
          (a, b) =>
            Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt), toTimestamp(b.lastPlayed)) -
            Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt), toTimestamp(a.lastPlayed))
        )
        .slice(0, 3),
    [campaigns]
  );

  return (
    <div className="p-12 h-full overflow-auto bauhaus-bg">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex justify-between items-start border-b-2 border-[var(--border-color)] pb-10">
          <div className="flex-1">
            <h1 className="text-7xl font-black uppercase tracking-tighter leading-[0.9] mb-4 text-[var(--text-main)]">
              КУЗНИЦА
              <br />
              <span className="text-[var(--col-red)]">ИСТОРИЙ</span>
            </h1>
            <div className="space-y-4">
              <p className="mono text-[var(--text-main)] font-bold uppercase text-sm tracking-[0.3em] glitch-text opacity-90">
                Рабочее пространство мастера / Мастерская
              </p>
              <div className="h-[2px] w-24 bg-[var(--col-red)]" />
            </div>
          </div>

          <div className="flex flex-col items-end gap-10 max-w-xl text-right">
            <div className="relative pr-8 py-2">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-[var(--col-red)]" />
              <div className="absolute right-[-4px] top-0 w-3 h-3 bg-[var(--col-red)]" />
              <div className="absolute right-[-4px] bottom-0 w-3 h-3 bg-[var(--text-main)]" />
              <div className="mono text-xl font-bold text-[var(--text-main)] leading-tight max-w-md uppercase glitch-text">
                <span className="text-[var(--col-red)]">[</span> Создавайте миры, лепите героев
                <br />
                и пишите легенды, которые останутся в веках{' '}
                <span className="text-[var(--col-red)]">]</span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button color="white" onClick={() => onOpenEditor('guide')}>
                {ICONS.Guide} РУКОВОДСТВО
              </Button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
          <BaseCard title="последние сценарии" accentColor="var(--col-red)" className="lg:col-span-2">
            <div className="w-full space-y-4 self-start">
              {recentScenarios.map((scenario) => (
                <button
                  key={scenario.id}
                  onClick={() => onOpenScenarioEditor(scenario.id)}
                  className="w-full text-left p-4 border border-[var(--border-color)] hover:border-[var(--col-red)] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="mono text-sm uppercase font-black text-[var(--text-main)]">{scenario.title}</h4>
                      <p className="mono text-[10px] text-[var(--text-muted)] mt-1">Отредактировано: {formatDate(scenario.updatedAt ?? scenario.createdAt)}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge color="var(--col-grey)">{`ГЛАВ ${scenario.chapters.length}`}</Badge>
                      </div>
                    </div>
                    <span className="text-[var(--text-main)]">{ICONS.ChevronRight}</span>
                  </div>
                </button>
              ))}

              {recentScenarios.length < 2 && (
                <AddTile
                  label="СОЗДАТЬ СЦЕНАРИЙ"
                  accentColor="var(--col-red)"
                  onClick={() => onOpenScenarioEditor()}
                  minHeight="h-[118px]"
                />
              )}
            </div>
          </BaseCard>

          <BaseCard title="Быстрый старт" accentColor="var(--col-yellow)">
            <div className="h-full flex flex-col gap-6">
              <div
                className="flex-1 p-8 bg-[var(--col-yellow)] text-black relative cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 group"
                onClick={() => onOpenMapEditor()}
              >
                <div className="absolute top-2 right-2 group-hover:rotate-12 transition-transform">{ICONS.Map}</div>
                <h5 className="font-black uppercase text-xl mb-2">Генератор карт</h5>
                <p className="text-xs font-bold opacity-60 uppercase">Начать с шаблона</p>
              </div>
              <div
                className="flex-1 p-8 bg-[var(--col-purple)] text-white relative cursor-pointer hover:scale-[1.02] transition-transform active:scale-95 group"
                onClick={() => onOpenEditor('characters')}
              >
                <div className="absolute top-2 right-2 group-hover:rotate-12 transition-transform">
                  {ICONS.Characters}
                </div>
                <h5 className="font-black uppercase text-xl mb-2">Генератор NPC</h5>
                <p className="text-xs font-bold opacity-60 uppercase">По пресету</p>
              </div>
            </div>
          </BaseCard>

          <BaseCard title="последние карты" accentColor="var(--col-blue)" className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
              {recentMaps.map((map, index) => (
                <div
                  key={map.id}
                  onClick={() => onOpenMapEditor(map.id)}
                  className="aspect-square bg-[var(--bg-main)] border border-[var(--border-color)] hover:border-[var(--col-blue)] transition-all p-4 flex flex-col justify-end group cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-full bg-[radial-gradient(var(--col-blue)_1px,transparent_1px)] bg-[size:10px_10px]" />
                  </div>
                  <div className="relative">
                    <p className="mono text-[10px] text-[var(--text-muted)] uppercase">Карта #{index + 1}</p>
                    <h6 className="mono text-xs uppercase font-bold text-[var(--text-main)] group-hover:text-[var(--col-blue)] transition-colors truncate">
                      {map.name}
                    </h6>
                  </div>
                </div>
              ))}

              {recentMaps.length < 4 && (
                <AddTile
                  label={recentMaps.length > 0 ? `ОТКРЫТЬ КАРТЫ (${maps.length})` : 'СОЗДАТЬ КАРТУ'}
                  accentColor="var(--col-blue)"
                  onClick={() => onOpenMapEditor()}
                  minHeight="aspect-square min-h-0"
                />
              )}
            </div>
          </BaseCard>

          <BaseCard title="последние кампании" accentColor={COLORS.accentPurple} className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {recentCampaigns.map((campaign) => {
                const scenarioCount = campaign.scenarioIds?.length ?? 0;
                const mapCount = campaign.mapIds?.length ?? 0;
                const characterCount = campaign.characterIds?.length ?? 0;

                return (
                  <div
                    key={campaign.id}
                    onClick={() => onOpenCampaignEditor(campaign.id)}
                    className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 group hover:border-[var(--col-purple)] transition-all cursor-pointer relative"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="mono text-sm uppercase font-black text-[var(--text-main)] group-hover:text-[var(--col-purple)] truncate pr-3">
                        {campaign.title}
                      </h4>
                      <div className="w-1.5 h-1.5 bg-[var(--col-purple)]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                      <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="text-lg font-bold mono text-[var(--text-main)]">{scenarioCount}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mono uppercase">Сценарии</div>
                      </div>
                      <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="text-lg font-bold mono text-[var(--text-main)]">{mapCount}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mono uppercase">Карты</div>
                      </div>
                      <div className="p-2 border border-[var(--border-color)] bg-[var(--bg-main)]">
                        <div className="text-lg font-bold mono text-[var(--text-main)]">{characterCount}</div>
                        <div className="text-[8px] text-[var(--text-muted)] mono uppercase">NPC</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] mono uppercase text-[var(--text-main)]">
                        <span>Прогресс</span>
                        <span>{campaign.progress}%</span>
                      </div>
                      <div className="h-1 bg-[var(--border-color)] w-full">
                        <div
                          className="h-full bg-[var(--col-purple)] transition-all"
                          style={{ width: `${campaign.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {recentCampaigns.length < 3 && (
                <AddTile
                  label={recentCampaigns.length > 0 ? `ОТКРЫТЬ КАМПАНИИ (${campaigns.length})` : 'СОЗДАТЬ КАМПАНИЮ'}
                  accentColor={COLORS.accentPurple}
                  onClick={() => onOpenCampaignEditor()}
                  minHeight="h-[190px]"
                />
              )}
            </div>
          </BaseCard>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
