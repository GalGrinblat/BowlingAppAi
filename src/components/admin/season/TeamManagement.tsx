import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { teamsApi, playersApi, seasonsApi } from '../../../services/api';
import { useTranslation } from '../../../contexts/LanguageContext';
import { BackButton } from '../../common/BackButton';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { getPlayerDisplayName } from '../../../utils/playerUtils';

import type { Season, Team, Player, RosterChange } from '../../../types/index';

export const TeamManagement: React.FC = () => {
  const navigate = useNavigate();
  const { seasonId } = useParams<{ seasonId: string }>();
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const [season, setSeason] = useState<Season | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [editingRoster, setEditingRoster] = useState(false);
  const [rosterChanges, setRosterChanges] = useState<RosterChange[]>([]);

  const loadData = async () => {
    const seasonData = await seasonsApi.getById(seasonId!);
    setSeason(seasonData ?? null);

    const teamsData = await teamsApi.getBySeason(seasonId!);
    setTeams(teamsData);

    const playersData = await playersApi.getAll();
    setAllPlayers(playersData.filter(p => p.active));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId]);

  const handleEditRoster = (team: Team) => {
    setSelectedTeam(team);
    setEditingRoster(true);
  };

  const handleSubstitutePlayer = async (team: Team, oldPlayerIndex: number, newPlayerId: string) => {
    const oldPlayerId = team.playerIds[oldPlayerIndex];
    if (!oldPlayerId) return;
    const oldPlayer = allPlayers.find(p => p.id === oldPlayerId);
    const newPlayer = allPlayers.find(p => p.id === newPlayerId);

    if (!newPlayer || !oldPlayer) return;

    // Create roster change record
    const change: RosterChange = {
      date: new Date().toISOString(),
      position: oldPlayerIndex,
      oldPlayerId,
      newPlayerId,
      oldPlayerName: getPlayerDisplayName(oldPlayer),
      newPlayerName: getPlayerDisplayName(newPlayer)
    };

    // Update team roster
    const updatedPlayerIds = [...team.playerIds];
    updatedPlayerIds[oldPlayerIndex] = newPlayerId;

    // Save roster changes to team metadata
    const existingChanges = team.rosterChanges || [];
    await teamsApi.update(team.id, {
      playerIds: updatedPlayerIds,
      rosterChanges: [...existingChanges, change]
    });

    setRosterChanges([change, ...rosterChanges]);
    await loadData();
    setEditingRoster(false);
    setSelectedTeam(null);
  };

  const getPlayerInfo = (playerId: string) => {
    return allPlayers.find(p => p.id === playerId);
  };

  const getAvailablePlayers = (team: Team) => {
    // Filter out players already on this team
    return allPlayers.filter(p => !team.playerIds.includes(p.id));
  };

  if (!season) return <div>{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('teams.title')}</h1>
            <p className="text-gray-600">{season.name}</p>
          </div>
          <BackButton label={t('teams.backToSeason')} onClick={() => navigate(`/admin/seasons/${seasonId}`)} />
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="font-semibold text-blue-800 mb-1">{t('teams.rosterInfoTitle')}</p>
            <p className="text-sm text-blue-600">
              {t('teams.rosterInfoDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="grid md:grid-cols-2 gap-6">
        {teams.map(team => {
          const teamPlayers = team.playerIds.map((id: string) => getPlayerInfo(id)).filter((p): p is Player => !!p);
          const recentChanges = (team.rosterChanges || []).slice(0, 3);

          return (
            <div key={team.id} className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-800">{team.name}</h2>
                <button
                  onClick={() => handleEditRoster(team)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-semibold text-sm"
                >
                  ✏️ {t('teams.editRoster')}
                </button>
              </div>

              {/* Current Roster */}
              <div className="space-y-2 mb-4">
                {teamPlayers.map((player, idx) => (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{getPlayerDisplayName(player)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Changes */}
              {recentChanges.length > 0 && (
                <div className="border-t pt-3">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2">{t('teams.recentChanges')}</h3>
                  <div className="space-y-1">
                    {recentChanges.map((change: RosterChange) => (
                      <div key={`${change.date}-${change.oldPlayerName}`} className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                        <span className="font-semibold">{change.oldPlayerName}</span>
                        {' '}{t('common.rightArrow')}{' '}
                        <span className="font-semibold">{change.newPlayerName}</span>
                        <span className="text-gray-500 ml-2">
                          ({formatDate(change.date)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingRoster && selectedTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {t('teams.editRosterFor').replace('{{team}}', selectedTeam.name)}
              </h2>
              
              <div className="space-y-4">
                {selectedTeam.playerIds.map((playerId: string, idx: number) => {
                  const currentPlayer = getPlayerInfo(playerId);
                  const availablePlayers = getAvailablePlayers(selectedTeam);

                  return (
                    <div key={playerId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-800">{currentPlayer ? getPlayerDisplayName(currentPlayer) : ''}</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          {t('teams.substituteWith')}
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value && confirm(t('teams.replaceConfirm').replace('{{player}}', currentPlayer ? getPlayerDisplayName(currentPlayer) : ''))) {
                              handleSubstitutePlayer(selectedTeam, idx, e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          defaultValue=""
                        >
                          <option value="">{t('teams.selectPlayer')}</option>
                          {availablePlayers.map(player => (
                            <option key={player.id} value={player.id}>
                              {getPlayerDisplayName(player)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setEditingRoster(false);
                    setSelectedTeam(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Roster Changes History */}
      {teams.some(t => t.rosterChanges && t.rosterChanges.length > 0) && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('teams.rosterChangeHistory')}</h2>
          <div className="space-y-2">
            {teams
              .flatMap((t: Team) => (t.rosterChanges || []).map((c: RosterChange) => ({ ...c, teamName: t.name })))
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((change) => (
                <div key={`${change.date}-${change.oldPlayerId}-${change.position}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🔄</span>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {change.teamName}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{change.oldPlayerName}</span>
                        {' '}{t('common.rightArrow')}{' '}
                        <span className="font-medium">{change.newPlayerName}</span>
                        <span className="text-gray-400 ml-2">
                          ({t('teams.position').replace('{{num}}', String(change.position + 1))})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(change.date)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
