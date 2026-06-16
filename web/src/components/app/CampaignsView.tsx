import { Edit3, Plus } from 'lucide-react';
import { AppView } from '../../appTypes';
import { COLORS, ICONS } from '../../constants';
import { Campaign } from '../../types';
import { BaseCard } from '../BaseCard';
import { AddTile, Button, SectionHeader } from '../UI';

interface CampaignsViewProps {
  campaigns: Campaign[];
  onOpenCampaignEditor: (campaign?: Campaign) => void;
  onDeleteCampaign: (id: string) => void;
  onOpenView: (view: AppView) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  onOpenCampaignEditor,
  onDeleteCampaign,
  onOpenView
}) => (
  <div className="p-12 h-full overflow-auto bauhaus-bg">
    <div className="max-w-7xl mx-auto space-y-12">
      <SectionHeader
        title="МЕНЕДЖЕР КАМПАНИЙ"
        subtitle="УПРАВЛЕНИЕ МИРАМИ"
        accentColor={COLORS.accentPurple}
        actions={
          <Button color="purple" size="lg" onClick={() => onOpenCampaignEditor()}>
            <Plus size={18} /> НОВАЯ КАМПАНИЯ
          </Button>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
        {campaigns.map((campaign) => (
          <BaseCard key={campaign.id} title={campaign.title} accentColor={COLORS.accentPurple}>
            <div className="space-y-6 flex flex-col h-full">
              <p className="text-[10px] mono uppercase" style={{ color: 'var(--text-muted)' }}>
                Последняя сессия: {campaign.lastPlayed}
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => onOpenView('scenarios')}
                  className="flex items-center justify-between p-3 border border-[var(--border-color)] hover:border-[var(--col-red)]"
                >
                  <div className="flex items-center gap-3">
                    {ICONS.Scenario}
                    <span className="mono text-[10px] uppercase font-bold">
                      Сценарии ({campaign.scenarioIds?.length || 0})
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => onOpenView('maps')}
                  className="flex items-center justify-between p-3 border border-[var(--border-color)] hover:border-[var(--col-white)]"
                >
                  <div className="flex items-center gap-3">
                    {ICONS.Map}
                    <span className="mono text-[10px] uppercase font-bold">
                      Карты ({campaign.mapIds?.length || 0})
                    </span>
                  </div>
                </button>
              </div>
              <div className="flex-1" />
              <div className="flex flex-col gap-2">
                <Button
                  inverted
                  color="purple"
                  className="w-full h-12"
                  onClick={() => onOpenCampaignEditor(campaign)}
                >
                  <Edit3 size={14} /> РЕДАКТИРОВАТЬ
                </Button>
                <button
                  onClick={() => onDeleteCampaign(campaign.id)}
                  className="py-2 mono text-[8px] uppercase font-black text-[var(--text-muted)] hover:text-[var(--col-red)] self-center"
                >
                  УДАЛИТЬ КАМПАНИЮ
                </button>
              </div>
            </div>
          </BaseCard>
        ))}
        <AddTile
          label="СОЗДАТЬ КАМПАНИЮ"
          accentColor={COLORS.accentPurple}
          onClick={() => onOpenCampaignEditor()}
          minHeight="h-[420px]"
        />
      </div>
    </div>
  </div>
);
