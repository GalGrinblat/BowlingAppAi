import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';

interface PlayerData {
  id: string;
  name: string;
  average: number;
  gamesPlayed: number;
  handicap: number;
}

interface PlayerRosterTableProps {
  teamName: string;
  players: PlayerData[];
  accentColor: 'blue' | 'purple';
}

export const PlayerRosterTable: React.FC<PlayerRosterTableProps> = ({ teamName, players, accentColor }) => {
  const { t, language } = useTranslation();
  const isRTL = language === 'he';
  const borderColor = accentColor === 'blue' ? 'border-blue-500' : 'border-purple-500';
  const handicapColor = accentColor === 'blue' ? 'text-blue-600' : 'text-purple-600';

  return (
    <div>
      <h5 className={`text-lg font-bold text-gray-800 mb-3 border-b-2 ${borderColor} pb-2`}>
        {teamName} {t('common.roster')}
      </h5>
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className={`${isRTL ? 'text-right' : 'text-left'} px-2 py-2 font-semibold`}>{t('common.player')}</th>
            <th className="text-center px-2 py-2 font-semibold">{t('common.gamesPlayed')}</th>
            <th className="text-center px-2 py-2 font-semibold">{t('common.average')}</th>
            <th className="text-center px-2 py-2 font-semibold">{t('common.handicap')}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, idx) => (
            <tr key={player.id} className="border-b border-gray-200">
              <td className="px-2 py-2">
                <div className={`font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{idx + 1}. {player.name}</div>
              </td>
              <td className="text-center px-2 py-2 text-gray-600">{player.gamesPlayed}</td>
              <td className="text-center px-2 py-2 font-semibold">
                {player.average > 0 ? player.average.toFixed(2) : '-'}
              </td>
              <td className={`text-center px-2 py-2 ${handicapColor} font-bold`}>
                {player.handicap > 0 ? player.handicap : '-'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50">
          <tr>
            <td className={`px-2 py-2 font-semibold ${isRTL ? 'text-right' : 'text-left'}`}>{t('common.total')}</td>
            <td></td>
            <td className="text-center px-2 py-2 font-bold">
              {(players.reduce((sum, p) => sum + p.average, 0) / players.length || 0).toFixed(2)}
            </td>
            <td className={`text-center px-2 py-2 font-bold ${handicapColor}`}>
              {players.reduce((sum, p) => sum + p.handicap, 0) || '-'}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
