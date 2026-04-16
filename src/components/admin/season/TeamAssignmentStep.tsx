import React from 'react';
import { useTranslation } from '../../../contexts/LanguageContext';
import { PageHeader } from '../../common/PageHeader';
import { getPlayerDisplayName } from '../../../utils/playerUtils';
import type { Player } from '../../../types/index';

type SimpleTeam = {
  name: string;
  playerIds: string[];
};

type SimplePlayer = Pick<Player, 'id' | 'firstName' | 'middleName' | 'lastName'>;

interface TeamAssignmentStepProps {
  teams: SimpleTeam[];
  playersPerTeam: number;
  availablePlayers: SimplePlayer[];
  onTeamNameChange: (teamIndex: number, name: string) => void;
  onAssignPlayer: (teamIndex: number, playerId: string) => void;
  onRemovePlayer: (teamIndex: number, playerId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const TeamAssignmentStep: React.FC<TeamAssignmentStepProps> = ({
  teams, playersPerTeam, availablePlayers,
  onTeamNameChange, onAssignPlayer, onRemovePlayer, onNext, onBack
}) => {
  const { t } = useTranslation();

  const getAssignedPlayers = (excludeTeamIndex: number) => {
    return new Set(
      teams.filter((_, i) => i !== excludeTeamIndex).flatMap(t => t.playerIds)
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('seasons.assignPlayers')}
        subtitle={t('seasons.assignPlayersDesc').replace('{{count}}', String(playersPerTeam))}
        back={{ label: t('common.back'), onClick: onBack }}
      />
      <div className="bg-white rounded-xl shadow-lg p-6">
        <form onSubmit={e => {
          e.preventDefault();
          const incompleteTeams = teams.filter(team => team.playerIds.length !== playersPerTeam);
          if (incompleteTeams.length > 0) {
            alert(t('validation.teamsNotComplete').replace('{{count}}', String(playersPerTeam)));
            return;
          }
          onNext();
        }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((team, teamIdx) => (
              <div key={teamIdx} className={`border rounded-lg p-4 ${team.playerIds.length === playersPerTeam ? 'bg-green-50 border-green-300' : 'bg-gray-50'}`}>
                <input type="text" value={team.name} onChange={e => onTeamNameChange(teamIdx, e.target.value)} className="mb-2 w-full px-2 py-1 border border-gray-300 rounded" />
                <div className="mb-2 text-xs font-semibold flex justify-between items-center">
                  <span className="text-gray-700">{t('seasons.teamRoster')}</span>
                  <span className={`${team.playerIds.length === playersPerTeam ? 'text-green-600' : team.playerIds.length > playersPerTeam ? 'text-red-600' : 'text-gray-500'}`}>
                    {team.playerIds.length}/{playersPerTeam}
                  </span>
                </div>
                <ul className="mb-2">
                  {team.playerIds.map((playerId: string) => {
                    const player = availablePlayers.find((p: SimplePlayer) => p.id === playerId);
                    return (
                      <li key={playerId} className="flex items-center justify-between mb-1">
                        <span>{player ? getPlayerDisplayName(player) : 'Unknown'}</span>
                        <button type="button" onClick={() => onRemovePlayer(teamIdx, playerId)} className="text-xs text-red-500 ml-2">{t('common.remove')}</button>
                      </li>
                    );
                  })}
                </ul>
                <div className="mb-1 text-xs text-gray-500">{t('seasons.addPlayer')}</div>
                <select
                  className="w-full px-2 py-1 border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value=""
                  onChange={e => { if (e.target.value) onAssignPlayer(teamIdx, e.target.value); }}
                  disabled={team.playerIds.length >= playersPerTeam}
                >
                  <option value="">
                    {team.playerIds.length >= playersPerTeam
                      ? t('validation.teamFull').replace('{{count}}', String(playersPerTeam))
                      : t('seasons.selectPlayer')}
                  </option>
                  {availablePlayers.filter(p => !getAssignedPlayers(teamIdx).has(p.id)).map((player: SimplePlayer) => (
                    <option key={player.id} value={player.id}>{getPlayerDisplayName(player)}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onBack} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold">{t('common.back')}</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">{t('common.next')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
