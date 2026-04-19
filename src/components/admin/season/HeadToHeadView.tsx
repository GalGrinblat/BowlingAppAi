import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { calculateHeadToHead, formatHeadToHead } from '../../../utils/headToHeadUtils';
import type { Team, Game } from '../../../types/index';

interface HeadToHeadViewProps {
  teams: Team[];
  games: Game[];
}

export const HeadToHeadView: React.FC<HeadToHeadViewProps> = ({ teams, games }) => {
  const { t } = useTranslation();

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
                  const h2h = calculateHeadToHead(team.id, opponent.id, games);

                  if (h2h.gamesPlayed === 0) {
                    return (
                      <div key={opponent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">{t('common.vs')} {opponent.name}</span>
                        <span className="text-sm text-gray-500 italic">{t('seasons.noMatchupsYet')}</span>
                      </div>
                    );
                  }

                  const teamWins = h2h.team1Wins;
                  const opponentWins = h2h.team2Wins;
                  const isWinning = teamWins > opponentWins;
                  const isLosing = teamWins < opponentWins;

                  return (
                    <div key={opponent.id} className={`flex items-center justify-between p-3 rounded-lg ${
                      isWinning ? 'bg-green-50 border border-green-200' :
                      isLosing ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{t('common.vs')} {opponent.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {formatHeadToHead(h2h, team.name, opponent.name)}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-2xl font-bold ${
                          isWinning ? 'text-green-600' :
                          isLosing ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {teamWins}-{opponentWins}{h2h.ties > 0 ? `-${h2h.ties}` : ''}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {t('common.average')}: {h2h.team1AvgPoints.toFixed(1)} {t('common.pts')}
                        </div>
                      </div>
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
