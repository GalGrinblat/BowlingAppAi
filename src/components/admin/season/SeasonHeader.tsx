import React, { useRef } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { PageHeader } from '../../common/PageHeader';
import type { Season, League, Team } from '../../../types/index';

interface SeasonHeaderProps {
  season: Season;
  league: League;
  teams: Team[];
  completedGames: number;
  totalGames: number;
  selectedRound: number;
  onBack: () => void;
  onManageTeams?: () => void;
  onExportSeason: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onCompleteSeason: () => void;
}

export const SeasonHeader: React.FC<SeasonHeaderProps> = ({
  season, league, teams, completedGames, totalGames, selectedRound,
  onBack, onManageTeams, onExportSeason, onImportFile, onCompleteSeason
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCompleted = season.status === 'completed';

  return (
    <PageHeader
      title={<>
        {season.name}
        {isCompleted && (
          <span className="ml-3 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold align-middle">
            {t('common.completed')}
          </span>
        )}
      </>}
      subtitle={league.name}
      back={{ label: t('common.backToLeague'), onClick: onBack }}
      actions={season.status === 'active' ? (
        <>
          {onManageTeams && (
            <button onClick={onManageTeams} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold">
              👥 {t('seasons.manageTeams')}
            </button>
          )}
          <button onClick={onExportSeason} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold" title={t('seasons.exportSeasonDesc')}>
            📥 {t('seasons.exportSeason')}
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold" title={t('seasons.importSeasonDesc')}>
            📤 {t('seasons.importSeason')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" onChange={onImportFile} className="hidden" />
          {completedGames === totalGames && (
            <button onClick={onCompleteSeason} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
              {t('seasons.completeSeason')}
            </button>
          )}
        </>
      ) : undefined}
    >
      <div className="flex gap-4 mt-4 text-sm text-gray-600">
        <span>🏆 {t('seasons.teamsCount').replace('{{count}}', String(teams.length))}</span>
        <span>🎳 {t('seasons.gamesComplete').replace('{{completed}}', String(completedGames)).replace('{{total}}', String(totalGames))}</span>
        <span>🔄 {t('seasons.roundOf').replace('{{current}}', String(selectedRound)).replace('{{total}}', String(season.seasonConfigurations.numberOfRounds))}</span>
      </div>
    </PageHeader>
  );
};
