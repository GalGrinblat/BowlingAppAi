import React from 'react';
import type { TeamStanding } from '../../../types/index';

type TeamLastResult = { result: 'W' | 'L' | 'D'; ownPoints: number; opponentPoints: number; opponentName: string };

interface TeamStandingsTableProps {
  standings: TeamStanding[];
  direction?: 'ltr' | 'rtl';
  t: (key: string) => string;
  getTeamName?: (teamId: string) => string;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
  previousRanks?: Map<string, number>;
  lastResults?: Map<string, TeamLastResult>;
}

export const TeamStandingsTable: React.FC<TeamStandingsTableProps> = ({
  standings,
  direction = 'ltr',
  t,
  getTeamName,
  showHeader: _showHeader = true,
  compact = false,
  className = '',
  previousRanks,
  lastResults,
}) => {
  const isRTL = direction === 'rtl';

  const cellPadding = compact ? 'px-2 py-2' : 'px-3 sm:px-4 py-3';
  const headerPadding = compact ? 'px-2 py-2' : 'px-3 sm:px-4 py-3';

  const getRankArrow = (teamId: string, currentRank: number) => {
    if (!previousRanks || compact) return null;
    const prev = previousRanks.get(teamId);
    if (prev === undefined) return null;
    if (prev > currentRank) return <span className="text-green-500 text-xs font-bold">▲</span>;
    if (prev < currentRank) return <span className="text-red-500 text-xs font-bold">▼</span>;
    return <span className="text-gray-400 text-xs">—</span>;
  };

  const getResultCell = (teamId: string) => {
    if (!lastResults) return <span className="text-gray-300 text-sm">-</span>;
    const r = lastResults.get(teamId);
    if (!r) return <span className="text-gray-300 text-sm">-</span>;
    const badgeCls = r.result === 'W'
      ? 'bg-green-100 text-green-700'
      : r.result === 'L'
      ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-600';
    const resultWord = r.result === 'W' ? t('seasons.resultWon') : r.result === 'L' ? t('seasons.resultLost') : t('seasons.resultDrew');
    return (
      <div className="text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-bold ${badgeCls}`}>
          {r.result}
        </span>
        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[8rem]">
          {resultWord}{' '}
          <span dir="ltr" className="inline-block">
            {isRTL ? `${r.opponentPoints}-${r.ownPoints}` : `${r.ownPoints}-${r.opponentPoints}`}
          </span>{' '}
          {t('seasons.resultVs')} {r.opponentName}
        </div>
      </div>
    );
  };

  return (
    <div className={`inline-block min-w-full align-middle ${className}`}>
      <div className="overflow-hidden">
        <table className="min-w-full" dir={direction}>
          <thead className="bg-gray-100">
            <tr>
              <th className={`${headerPadding} font-semibold text-gray-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('seasons.rank')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('common.team')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm`}>
                {t('common.gamesPlayed')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm`}>
                {t('common.wins')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm`}>
                {t('common.losses')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm ${compact ? '' : 'hidden sm:table-cell'}`}>
                {t('common.draws')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm`}>
                {t('common.points')}
              </th>
              <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm ${compact ? '' : 'hidden md:table-cell'}`}>
                {t('seasons.pins')}
              </th>
              {!compact && (
                <th className={`${headerPadding} font-semibold text-gray-700 text-center text-sm hidden sm:table-cell`}>
                  {t('seasons.lastResult')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, index) => (
              <tr key={standing.teamId} className="border-b border-gray-200 hover:bg-gray-50">
                <td className={cellPadding}>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-800">{index + 1}</span>
                    {getRankArrow(standing.teamId, index + 1)}
                  </div>
                </td>
                <td className={`${cellPadding} font-semibold text-gray-800 text-sm`}>
                  {standing.teamName || (getTeamName ? getTeamName(standing.teamId) : standing.teamId)}
                </td>
                <td className={`${cellPadding} text-center text-gray-600 text-sm`}>
                  {standing.gamesPlayed}
                </td>
                <td className={`${cellPadding} text-center text-green-600 font-semibold text-sm`}>
                  {standing.wins}
                </td>
                <td className={`${cellPadding} text-center text-red-600 font-semibold text-sm`}>
                  {standing.losses}
                </td>
                <td className={`${cellPadding} text-center text-gray-600 text-sm ${compact ? '' : 'hidden sm:table-cell'}`}>
                  {standing.draws}
                </td>
                <td className={`${cellPadding} text-center`}>
                  <span className="font-bold text-blue-600 text-base sm:text-lg">{standing.points}</span>
                </td>
                <td className={`${cellPadding} text-center text-gray-600 text-sm ${compact ? '' : 'hidden md:table-cell'}`}>
                  {standing.totalPinsWithHandicap}
                </td>
                {!compact && (
                  <td className={`${cellPadding} hidden sm:table-cell`}>
                    {getResultCell(standing.teamId)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
