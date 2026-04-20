import React, { useMemo } from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { calculateHeadToHead } from '../../../utils/headToHeadUtils';
import { H2HRecord } from '../../common/H2HRecord';
import type { Team, Game } from '../../../types/index';

interface HeadToHeadViewProps {
  teams: Team[];
  games: Game[];
}

export const HeadToHeadView: React.FC<HeadToHeadViewProps> = ({ teams, games }) => {
  const { t } = useTranslation();

  // Pre-compute all pair records once — key is "teamAId:teamBId" (canonical order)
  const pairMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateHeadToHead>>();
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        const a = teams[i]!;
        const b = teams[j]!;
        map.set(`${a.id}:${b.id}`, calculateHeadToHead(a.id, b.id, games));
      }
    }
    return map;
  }, [teams, games]);

  const getH2H = (teamId: string, opponentId: string) => {
    const key = `${teamId}:${opponentId}`;
    const reverseKey = `${opponentId}:${teamId}`;
    const raw = pairMap.get(key) ?? pairMap.get(reverseKey);
    if (!raw) return null;
    // If the pair was stored with opponents reversed, swap team1/team2 perspective
    if (pairMap.has(reverseKey) && !pairMap.has(key)) {
      return {
        ...raw,
        team1Wins: raw.team2Wins,
        team2Wins: raw.team1Wins,
        team1TotalPoints: raw.team2TotalPoints,
        team2TotalPoints: raw.team1TotalPoints,
        team1AvgPoints: raw.team2AvgPoints,
        team2AvgPoints: raw.team1AvgPoints,
        winStreak: raw.winStreak
          ? { team: raw.winStreak.team === 'team1' ? 'team2' : 'team1', count: raw.winStreak.count }
          : null,
      };
    }
    return raw;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('seasons.headToHeadRecords')}</h2>
      <p className="text-gray-600 mb-6">{t('seasons.headToHeadDesc')}</p>
      <div className="space-y-6">
        {teams.map(team => {
          const opponents = teams.filter(t => t.id !== team.id);

          return (
            <div key={team.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-bold text-gray-800 mb-3">{team.name}</h3>
              <div className="space-y-2">
                {opponents.map(opponent => {
                  const h2h = getH2H(team.id, opponent.id);

                  if (!h2h || h2h.gamesPlayed === 0) {
                    return (
                      <div key={opponent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">{t('common.vs')} {opponent.name}</span>
                        <span className="text-sm text-gray-500 italic">{t('seasons.noMatchupsYet')}</span>
                      </div>
                    );
                  }

                  const isWinning = h2h.team1Wins > h2h.team2Wins;
                  const isLosing = h2h.team1Wins < h2h.team2Wins;

                  return (
                    <div key={opponent.id} className={`p-3 rounded-lg ${
                      isWinning ? 'bg-green-50 border border-green-200' :
                      isLosing ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <H2HRecord h2h={h2h} team1Name={team.name} team2Name={opponent.name} variant="full" />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
