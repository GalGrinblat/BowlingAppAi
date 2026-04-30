import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import type { StandingsFilter } from '../../../hooks/useSeasonStandings';

interface StandingsFilterControlsProps {
  title: string;
  standingsFilter: StandingsFilter | null;
  setStandingsFilter: (filter: StandingsFilter | null) => void;
  completedMatchDayEvents: { round: number; matchDay: number }[];
  getMatchDayLabel: (round: number, matchDay: number) => string;
  onPrint: () => void;
}

export const StandingsFilterControls: React.FC<StandingsFilterControlsProps> = ({
  title,
  standingsFilter,
  setStandingsFilter,
  completedMatchDayEvents,
  getMatchDayLabel,
  onPrint,
}) => {
  const { t } = useTranslation();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!e.target.value) {
      setStandingsFilter(null);
    } else {
      const [roundStr, matchDayStr] = e.target.value.split('-');
      setStandingsFilter({ round: Number(roundStr), matchDay: Number(matchDayStr) });
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <div className="flex items-center gap-2">
        {completedMatchDayEvents.length > 0 && (
          <select
            value={standingsFilter ? `${standingsFilter.round}-${standingsFilter.matchDay}` : ''}
            onChange={handleSelectChange}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">{t('seasons.currentStandings')}</option>
            {completedMatchDayEvents.map(({ round, matchDay }) => (
              <option key={`${round}-${matchDay}`} value={`${round}-${matchDay}`}>
                {getMatchDayLabel(round, matchDay)}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={onPrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm"
        >
          🖨️ {t('common.print')}
        </button>
      </div>
    </div>
  );
};
