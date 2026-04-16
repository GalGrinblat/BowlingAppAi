import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { BackButton } from '../../common/BackButton';
import { getPlayerDisplayName } from '../../../utils/playerUtils';
import type { CurrentPlayerAverages, League, Player } from '../../../types/index';

type SimpleTeam = {
  name: string;
  playerIds: string[];
};

type SimplePlayer = Pick<Player, 'id' | 'firstName' | 'middleName' | 'lastName'>;

interface PlayerAveragesStepProps {
  league: League;
  teams: SimpleTeam[];
  availablePlayers: SimplePlayer[];
  playerAverages: CurrentPlayerAverages;
  onPlayerAveragesChange: (averages: CurrentPlayerAverages) => void;
  onSubmit: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export const PlayerAveragesStep: React.FC<PlayerAveragesStepProps> = ({
  league, teams, availablePlayers, playerAverages,
  onPlayerAveragesChange, onSubmit, onBack, onCancel
}) => {
  const { t, direction } = useTranslation();

  const allPlayersWithTeams = teams.flatMap(team =>
    team.playerIds.map((playerId: string) => {
      const player = availablePlayers.find((p: SimplePlayer) => p.id === playerId);
      const avgObj = playerAverages[playerId] || { average: 0, gamesPlayed: 0, totalPins: 0 };
      return {
        playerId,
        playerName: player ? getPlayerDisplayName(player) : 'Unknown',
        teamName: team.name,
        average: avgObj.average,
      };
    })
  );

  const textAlign = direction === 'rtl' ? 'text-right' : 'text-left';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('seasons.createSeason')}</h1>
            <p className="text-gray-600">{league.name}</p>
          </div>
          <BackButton label={t('common.backToLeague')} onClick={onCancel} />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('seasons.reviewPlayerAverages')}</h2>
        <p className="text-gray-600 mb-6">{t('seasons.reviewPlayerAveragesDesc')}</p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 ${textAlign} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t('seasons.playerName')}</th>
                <th className={`px-6 py-3 ${textAlign} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t('common.team')}</th>
                <th className={`px-6 py-3 ${textAlign} text-xs font-medium text-gray-500 uppercase tracking-wider`}>{t('common.average')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allPlayersWithTeams.map((player) => (
                <tr key={player.playerId} className="hover:bg-gray-50">
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 ${textAlign}`}>{player.playerName}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${textAlign}`}>{player.teamName}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 ${textAlign}`}>
                    <input
                      type="number"
                      min="0"
                      max="300"
                      step="0.1"
                      value={player.average}
                      onChange={e => {
                        const newAvg = parseFloat(e.target.value) || 0;
                        onPlayerAveragesChange({
                          ...playerAverages,
                          [player.playerId]: { average: newAvg, totalPins: 0, gamesPlayed: 0 }
                        });
                      }}
                      className="w-24 px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-6">
          <BackButton type="button" label={t('common.back')} onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold" />
          <button type="button" onClick={onSubmit} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">{t('seasons.createSeason')}</button>
          <button type="button" onClick={onCancel} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">{t('common.cancel')}</button>
        </div>
      </div>
    </div>
  );
};
