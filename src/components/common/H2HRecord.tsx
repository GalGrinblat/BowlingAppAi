import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import type { HeadToHeadStats } from '../../utils/headToHeadUtils';

interface H2HRecordProps {
  h2h: HeadToHeadStats;
  team1Name: string;
  team2Name: string;
  variant: 'full' | 'compact' | 'print';
}

export const H2HRecord: React.FC<H2HRecordProps> = ({ h2h, team1Name, team2Name, variant }) => {
  const { t } = useTranslation();

  const isTeam1Winning = h2h.team1Wins > h2h.team2Wins;
  const isTeam2Winning = h2h.team2Wins > h2h.team1Wins;

  const team1ScoreColor = isTeam1Winning
    ? 'text-green-600'
    : isTeam2Winning
    ? 'text-red-600'
    : 'text-gray-600';

  const team2ScoreColor = isTeam2Winning
    ? 'text-green-600'
    : isTeam1Winning
    ? 'text-red-600'
    : 'text-gray-600';

  const streakTeamName =
    h2h.winStreak?.team === 'team1' ? team1Name : team2Name;

  if (variant === 'compact') {
    return (
      <div dir="ltr" className="flex items-center gap-1.5 text-sm flex-wrap">
        <span className="text-gray-500 font-medium">📊 {t('games.seriesRecord')}</span>
        <span className="font-semibold text-gray-800">{team1Name}</span>
        <span className={`font-bold text-base ${team1ScoreColor}`}>{h2h.team1Wins}</span>
        <span className="text-gray-400">—</span>
        <span className={`font-bold text-base ${team2ScoreColor}`}>{h2h.team2Wins}</span>
        <span className="font-semibold text-gray-800">{team2Name}</span>
        {h2h.ties > 0 && (
          <span className="text-xs text-gray-500">· {h2h.ties} {t('common.draws').toLowerCase()}</span>
        )}
      </div>
    );
  }

  if (variant === 'print') {
    return (
      <div dir="ltr" className="mt-2 text-center">
        <div className="text-xs text-gray-500 mb-0.5">{t('games.seriesRecord')}</div>
        <div className="text-sm font-bold text-gray-800">
          {team1Name} {h2h.team1Wins} — {h2h.team2Wins} {team2Name}
        </div>
      </div>
    );
  }

  // variant === 'full'
  return (
    <div dir="ltr">
      <div className="flex items-center justify-between">
        <div className="flex-1 text-left">
          <div className="font-semibold text-gray-800">{team1Name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {t('common.average')}: {h2h.team1AvgPoints.toFixed(1)} {t('common.pts')}
          </div>
        </div>
        <div className="mx-4 text-center">
          <div className="flex items-center gap-1">
            <span className={`text-2xl font-bold ${team1ScoreColor}`}>{h2h.team1Wins}</span>
            <span className="text-xl text-gray-400 font-light">—</span>
            <span className={`text-2xl font-bold ${team2ScoreColor}`}>{h2h.team2Wins}</span>
          </div>
          {h2h.ties > 0 && (
            <div className="text-xs text-gray-500 mt-0.5">
              ({h2h.ties} {t('common.draws').toLowerCase()})
            </div>
          )}
        </div>
        <div className="flex-1 text-right">
          <div className="font-semibold text-gray-800">{team2Name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {t('common.average')}: {h2h.team2AvgPoints.toFixed(1)} {t('common.pts')}
          </div>
        </div>
      </div>
      {h2h.winStreak && h2h.winStreak.count >= 2 && (
        <div className="mt-1.5 text-xs text-center text-orange-600 font-medium">
          🔥 {streakTeamName} — {h2h.winStreak.count} {t('seasons.gameStreak')}
        </div>
      )}
    </div>
  );
};
