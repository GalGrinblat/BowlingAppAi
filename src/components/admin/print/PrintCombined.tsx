import React, { useEffect, useState } from 'react';
import { seasonsApi, teamsApi, gamesApi, leaguesApi, playersApi } from '../../../services/api';
import { calculateTeamStandings, calculatePlayerSeasonStats, calculateCurrentPlayerAverages } from '../../../utils/standingsUtils';
import { useTranslation } from '../../../contexts/LanguageContext';
import { useDateFormat } from '../../../hooks/useDateFormat';
import { getPlayerDisplayName } from '../../../utils/playerUtils';
import { TeamStandingsTable } from '../config/TeamStandingsTable';
import { PlayerStandingsTable } from '../config/PlayerStandingsTable';
import { MatchDayReport } from './MatchDayReport';
import type { TeamPlayerInfo } from './MatchDayReport';
import './printStyles.css';

import type { Game, League, Season, Team, TeamStanding, PlayerStats, CurrentPlayerAverages } from '../../../types/index';

interface PrintCombinedProps {
  seasonId: string;
  matchDay: number;
  includeMatchDay: boolean;
  includeTeamStandings: boolean;
  includePlayerStandings: boolean;
  onClose: () => void;
}

export const PrintCombined: React.FC<PrintCombinedProps> = ({
  seasonId, matchDay, includeMatchDay, includeTeamStandings, includePlayerStandings, onClose
}) => {
  const { t, direction } = useTranslation();
  const { formatDate, formatTime } = useDateFormat();
  const [season, setSeason] = useState<Season | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [matchDayGames, setMatchDayGames] = useState<Game[]>([]);
  const [teamStandings, setTeamStandings] = useState<TeamStanding[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [teamPlayersMap, setTeamPlayersMap] = useState<Record<string, TeamPlayerInfo[]>>({});

  const getTeamPlayers = async (team: Team, seasonData: Season, averages: CurrentPlayerAverages) => {
    const playerPromises = team.playerIds.map(async (playerId: string) => {
      const player = await playersApi.getById(playerId);
      const playerName = player ? getPlayerDisplayName(player) : 'Unknown';
      const currentAvg = averages[playerId]?.average || 0;
      const currentGamesPlayed = averages[playerId]?.gamesPlayed || 0;

      let handicap = 0;
      if (seasonData.seasonConfigurations.useHandicap && currentAvg > 0 && currentAvg < seasonData.seasonConfigurations.handicapBasis) {
        const diff = seasonData.seasonConfigurations.handicapBasis - currentAvg;
        handicap = Math.ceil(diff * (seasonData.seasonConfigurations.handicapPercentage / 100));
      }

      return { id: playerId, name: playerName, average: currentAvg, gamesPlayed: currentGamesPlayed, handicap };
    });

    const players = await Promise.all(playerPromises);
    return players.sort((a, b) => (b.average || 0) - (a.average || 0));
  };

  const loadData = async () => {
    const seasonData = await seasonsApi.getById(seasonId);
    if (!seasonData) return;
    setSeason(seasonData);

    const leagueData = await leaguesApi.getById(seasonData.leagueId);
    if (!leagueData) return;
    setLeague(leagueData);

    const teamsData = await teamsApi.getBySeason(seasonId);
    setTeams(teamsData);

    const gamesData = await gamesApi.getBySeason(seasonId);
    setGames(gamesData);

    const matchDayGamesData = gamesData.filter(g => g.matchDay === matchDay);
    setMatchDayGames(matchDayGamesData);

    setTeamStandings(calculateTeamStandings(teamsData, gamesData));
    setPlayerStats(calculatePlayerSeasonStats(teamsData, gamesData));

    if (includeMatchDay) {
      const previousGames = gamesData.filter(g => g.status === 'completed' && g.matchDay < matchDay);
      let averagesToUse: CurrentPlayerAverages;
      if (previousGames.length === 0) {
        averagesToUse = seasonData.initialPlayerAverages || {};
      } else {
        averagesToUse = calculateCurrentPlayerAverages(previousGames);
      }

      const playersMap: Record<string, TeamPlayerInfo[]> = {};
      for (const team of teamsData) {
        playersMap[team.id] = await getTeamPlayers(team, seasonData, averagesToUse);
      }
      setTeamPlayersMap(playersMap);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonId, matchDay]);

  if (!season || !league) return <div>{t('common.loading')}</div>;

  const completedGames = games.filter(g => g.status === 'completed');
  const getTeamName = (teamId: string) => teams.find(t => t.id === teamId)?.name || teamId;

  return (
    <div className="print-modal-root fixed inset-0 bg-white z-50 overflow-auto" dir={direction}>
      <div className="no-print bg-gray-100 p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-bold text-gray-800">{t('print.printPreview')}</h2>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            🖨️ {t('common.print')}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold">
            {t('common.close')}
          </button>
        </div>
      </div>

      <div className="print-content">
        {includeTeamStandings && (
          <div className="print-section p-8 max-w-5xl mx-auto">
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{league.name}</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">{season.name}</h2>
              <h3 className="text-xl font-semibold text-blue-600">{t('seasons.teamStandings')}</h3>
              <div className="mt-4 text-sm text-gray-600">
                <span>{t('common.gamesPlayed')}: {completedGames.length}</span>
              </div>
            </div>
            {teamStandings.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('seasons.noStandings')}</div>
            ) : (
              <TeamStandingsTable standings={teamStandings} direction={direction} t={t} getTeamName={getTeamName} showHeader={true} compact={false} />
            )}
            <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
              <p>{t('common.printedOn')}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}</p>
              <p className="mt-1">{league.name} • {season.name}</p>
            </div>
          </div>
        )}

        {includePlayerStandings && (
          <div className="print-section p-8 max-w-6xl mx-auto">
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{league.name}</h1>
              <h2 className="text-2xl font-semibold text-gray-700 mb-4">{season.name}</h2>
              <h3 className="text-xl font-semibold text-blue-600">{t('seasons.playerStandings')}</h3>
              <div className="mt-4 text-sm text-gray-600">
                <span>{t('common.gamesPlayed')}: {completedGames.length}</span>
              </div>
            </div>
            {playerStats.length === 0 ? (
              <div className="text-center text-gray-500 py-8">{t('seasons.noStandings')}</div>
            ) : (
              <PlayerStandingsTable playerStats={playerStats} direction={direction} t={t} showHeader={true} compact={false} />
            )}
            <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
              <p>{t('common.printedOn')}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}</p>
              <p className="mt-1">{league.name} • {season.name}</p>
            </div>
          </div>
        )}

        {includeMatchDay && (
          <div className="p-8 max-w-7xl mx-auto">
            <MatchDayReport
              season={season}
              league={league}
              teams={teams}
              games={games}
              matchDayGames={matchDayGames}
              matchDay={matchDay}
              teamStandings={teamStandings}
              teamPlayersMap={teamPlayersMap}
            />
            <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-sm text-gray-600">
              <p>{t('common.printedOn')}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}</p>
              <p className="mt-1">{league.name} • {season.name}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
